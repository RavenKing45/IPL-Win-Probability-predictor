(() => {
    const svg = document.getElementById("calibrationChart");
    const empty = document.getElementById("calibrationEmpty");
    const errorText = document.getElementById("calibrationError");
    const badge = document.getElementById("calibrationBadge");
    const summary = document.getElementById("calibrationSummary");
    if (!svg || !empty || !badge || !summary) return;

    const NS = "http://www.w3.org/2000/svg";
    const WIDTH = 760;
    const HEIGHT = 470;
    const MARGIN = { top: 28, right: 28, bottom: 82, left: 82 };
    const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
    const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

    const x = (v) => MARGIN.left + clamp01(v) * PLOT_WIDTH;
    const y = (v) => MARGIN.top + (1 - clamp01(v)) * PLOT_HEIGHT;
    const clamp01 = (v) => Math.max(0, Math.min(1, Number(v)));

    function make(tag, attrs = {}, text = null) {
        const node = document.createElementNS(NS, tag);
        Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
        if (text !== null) node.textContent = text;
        return node;
    }

    function addLine(parent, cls, x1, y1, x2, y2) {
        parent.appendChild(make("line", { class: cls, x1, y1, x2, y2 }));
    }

    function addText(parent, cls, xValue, yValue, text, anchor = "middle") {
        parent.appendChild(make("text", { class: cls, x: xValue, y: yValue, "text-anchor": anchor }, text));
    }

    function showError(message) {
        svg.replaceChildren();
        svg.hidden = true;
        empty.hidden = false;
        if (errorText) errorText.textContent = message;
        badge.textContent = "Data unavailable";
        summary.textContent = "The chart could not load its saved calibration results.";
    }

    function render(data) {
        const bins = (Array.isArray(data.bins) ? data.bins : [])
            .map((bin) => ({
                predicted: Number(bin.mean_predicted_probability),
                observed: Number(bin.observed_win_rate),
                count: Number(bin.count || 0),
                label: String(bin.label || "Probability band"),
            }))
            .filter((bin) => Number.isFinite(bin.predicted) && Number.isFinite(bin.observed)
                && bin.predicted >= 0 && bin.predicted <= 1
                && bin.observed >= 0 && bin.observed <= 1 && bin.count > 0)
            .sort((a, b) => a.predicted - b.predicted);

        if (bins.length < 2) {
            throw new Error("The data file contains fewer than two usable probability bands.");
        }

        svg.replaceChildren();
        svg.setAttribute("viewBox", `0 0 ${WIDTH} ${HEIGHT}`);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.setAttribute("focusable", "false");
        svg.appendChild(make("title", {}, "Calibration of predicted win probability"));
        svg.appendChild(make("desc", {}, "The dashed diagonal shows perfect calibration. The green line shows the observed win rate in groups of similar predictions."));

        const grid = make("g", { "aria-hidden": "true" });
        for (let i = 0; i <= 5; i++) {
            const value = i / 5;
            addLine(grid, "cal-grid", x(value), y(0), x(value), y(1));
            addLine(grid, "cal-grid", x(0), y(value), x(1), y(value));
            addText(grid, "cal-tick", x(value), y(0) + 25, `${Math.round(value * 100)}%`);
            addText(grid, "cal-tick", MARGIN.left - 14, y(value) + 4, `${Math.round(value * 100)}%`, "end");
        }
        svg.appendChild(grid);

        addLine(svg, "cal-ideal-line", x(0), y(0), x(1), y(1));
        addText(svg, "cal-ideal-label", x(0.58), y(0.61) - 10, "Perfect calibration");
        addLine(svg, "cal-axis", x(0), y(0), x(1), y(0));
        addLine(svg, "cal-axis", x(0), y(0), x(0), y(1));
        addText(svg, "cal-axis-title", MARGIN.left + PLOT_WIDTH / 2, HEIGHT - 23, "Model's average predicted win chance");
        svg.appendChild(make("text", {
            class: "cal-axis-title",
            transform: `translate(22 ${MARGIN.top + PLOT_HEIGHT / 2}) rotate(-90)`,
            "text-anchor": "middle",
        }, "Actual win rate"));

        const pathData = bins.map((bin, i) => `${i === 0 ? "M" : "L"} ${x(bin.predicted).toFixed(2)} ${y(bin.observed).toFixed(2)}`).join(" ");
        svg.appendChild(make("path", { class: "cal-observed-line", d: pathData }));

        bins.forEach((bin) => {
            const predicted = `${(bin.predicted * 100).toFixed(1)}%`;
            const observed = `${(bin.observed * 100).toFixed(1)}%`;
            const label = `${bin.label}: predicted ${predicted}; actual win rate ${observed}; ${bin.count.toLocaleString()} delivery states`;
            const point = make("circle", {
                class: "cal-point",
                cx: x(bin.predicted),
                cy: y(bin.observed),
                r: 6,
                tabindex: 0,
                role: "img",
                "aria-label": label,
            });
            point.appendChild(make("title", {}, label));
            svg.appendChild(point);
        });

        svg.hidden = false;
        empty.hidden = true;
        badge.textContent = `${Number(data.validation_states || 0).toLocaleString()} held-out states`;
        const stateCount = Number(data.validation_states || 0).toLocaleString();
        const matchCount = Number(data.validation_matches || 0).toLocaleString();
        const brier = Number(data.brier_score);
        const logLoss = Number(data.log_loss);
        const metrics = Number.isFinite(brier) && Number.isFinite(logLoss)
            ? ` Brier score: ${brier.toFixed(3)}; log loss: ${logLoss.toFixed(3)} (lower is better).`
            : "";
        summary.textContent = `Based on ${stateCount} held-out delivery states across ${matchCount} matches. Hover over or focus a dot to see its predicted chance, observed win rate and sample size.${metrics}`;
    }

    async function load() {
        try {
            const response = await fetch("/calibration_data.json", { cache: "no-store" });
            if (!response.ok) throw new Error(`Could not load /calibration_data.json (HTTP ${response.status}).`);
            const data = await response.json();
            render(data);
        } catch (error) {
            console.error("Calibration chart failed to render:", error);
            showError(`${error.message} Ensure public/calibration_data.json exists, then refresh this page.`);
        }
    }

    load();
})();
