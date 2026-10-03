document.addEventListener("DOMContentLoaded", () => {
    const DEFAULTS = {
        targetRuns: 180,
        currentScore: 80,
        oversCompleted: 10.0,
        wicketsLost: 3,
        runsLast30: 45,
        wicketsLast30: 1
    };

    const $ = (id) => document.getElementById(id);

    const fields = {
        targetRuns: $("targetRuns"),
        currentScore: $("currentScore"),
        oversCompleted: $("oversCompleted"),
        wicketsLost: $("wicketsLost"),
        runsLast30: $("runsLast30"),
        wicketsLast30: $("wicketsLast30")
    };

    const outputs = {
        winProbability: $("winProbability"),
        probabilityCaption: $("probabilityCaption"),
        winValue: $("winValue"),
        lossValue: $("lossValue"),
        winBar: $("winBar"),
        lossBar: $("lossBar"),
        runsLeft: $("runsLeft"),
        requiredRate: $("requiredRate"),
        currentRate: $("currentRate"),
        wicketsLeft: $("wicketsLeft"),
        errorMessage: $("errorMessage")
    };

    const predictBtn = $("predictBtn");
    const resetBtn = $("resetBtn");
    const gauge = $("gauge");

    const TICK_COUNT = 44;
    const CX = 130;
    const CY = 130;
    const INNER_RADIUS = 92;

    function buildGauge() {
        let markup = "";

        for (let i = 0; i < TICK_COUNT; i++) {
            const angle = Math.PI - (Math.PI * i) / (TICK_COUNT - 1);
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            const outerRadius = i % 4 === 0 ? 116 : 108;

            const x1 = CX + INNER_RADIUS * cos;
            const y1 = CY - INNER_RADIUS * sin;
            const x2 = CX + outerRadius * cos;
            const y2 = CY - outerRadius * sin;

            markup += `
                <line
                    id="tick-${i}"
                    class="gauge-tick"
                    x1="${x1.toFixed(2)}"
                    y1="${y1.toFixed(2)}"
                    x2="${x2.toFixed(2)}"
                    y2="${y2.toFixed(2)}"
                    stroke="var(--line)"
                    stroke-width="3.2"
                />
            `;
        }

        gauge.innerHTML = markup;
    }

    function updateGauge(probability) {
        const filledTicks = Math.round((probability / 100) * TICK_COUNT);

        for (let i = 0; i < TICK_COUNT; i++) {
            const tick = document.getElementById(`tick-${i}`);
            tick.setAttribute(
                "stroke",
                i < filledTicks ? "var(--ink)" : "var(--line)"
            );
        }
    }

    function getCaption(probability) {
        if (probability >= 90) {
            return "In a commanding position";
        }

        if (probability >= 65) {
            return "Well ahead of the game";
        }

        if (probability >= 52) {
            return "Slightly ahead";
        }

        if (probability >= 40) {
            return "Slightly behind the game";
        }

        if (probability >= 25) {
            return "Behind the game";
        }

        return "Needs a big turnaround";
    }

    function showError(message) {
        outputs.errorMessage.textContent = message;
    }

    function clearError() {
        outputs.errorMessage.textContent = "";
    }

    function readNumber(input) {
        return Number(input.value);
    }

    function validateInputs() {
        const values = Object.fromEntries(
            Object.entries(fields).map(([key, input]) => [
                key,
                readNumber(input)
            ])
        );

        if (Object.values(values).some((value) => !Number.isFinite(value))) {
            throw new Error("Please fill in every field.");
        }

        if (values.targetRuns <= 0) {
            throw new Error("Target runs must be greater than 0.");
        }

        if (values.currentScore < 0) {
            throw new Error("Current score cannot be negative.");
        }

        if (values.currentScore >= values.targetRuns) {
            throw new Error("Current score must be below the target.");
        }

        if (
            values.oversCompleted < 0.1 ||
            values.oversCompleted > 19.5
        ) {
            throw new Error("Overs must be between 0.1 and 19.5.");
        }

        if (
            values.wicketsLost < 0 ||
            values.wicketsLost > 10
        ) {
            throw new Error("Wickets lost must be between 0 and 10.");
        }

        if (values.runsLast30 < 0) {
            throw new Error("Runs in the last 30 balls cannot be negative.");
        }

        if (
            values.wicketsLast30 < 0 ||
            values.wicketsLast30 > 10
        ) {
            throw new Error("Recent wickets must be between 0 and 10.");
        }

        return values;
    }

    function buildPayload(values) {
        return {
            target_runs: values.targetRuns,
            current_score: values.currentScore,
            overs_completed: values.oversCompleted,
            wickets_lost: values.wicketsLost,
            runs_last_30: values.runsLast30,
            wickets_last_30: values.wicketsLast30
        };
    }

    function updateFromResponse(data) {
        const win = Number(data.win_probability);
        const loss = Number(data.loss_probability);

        const features = data.features || {};

        outputs.winProbability.textContent = win.toFixed(1);
        outputs.winValue.textContent = `${win.toFixed(1)}%`;
        outputs.lossValue.textContent = `${loss.toFixed(1)}%`;

        outputs.winBar.style.width = `${win}%`;
        outputs.lossBar.style.width = `${loss}%`;

        outputs.probabilityCaption.textContent = getCaption(win);

        if (features.runs_left !== undefined) {
            outputs.runsLeft.textContent =
                Number(features.runs_left).toFixed(0);
        }

        if (features.RRR !== undefined) {
            outputs.requiredRate.textContent =
                Number(features.RRR).toFixed(1);
        }

        if (features.CRR !== undefined) {
            outputs.currentRate.textContent =
                Number(features.CRR).toFixed(1);
        }

        if (features.wickets_left !== undefined) {
            outputs.wicketsLeft.textContent =
                Number(features.wickets_left).toFixed(0);
        }

        updateGauge(win);
    }

    async function calculateProbability() {
        try {
            clearError();

            const values = validateInputs();

            predictBtn.disabled = true;
            predictBtn.innerHTML = '<span aria-hidden="true">⟳</span> Calculating...';

            const response = await fetch("/api/predict", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(buildPayload(values))
            });

            let data = null;

            try {
                data = await response.json();
            } catch {
                throw new Error("The server returned an invalid response.");
            }

            if (!response.ok) {
                throw new Error(
                    data?.error || "Prediction request failed."
                );
            }

            updateFromResponse(data);
        } catch (error) {
            console.error(error);
            showError(error.message || "Something went wrong.");
        } finally {
            predictBtn.disabled = false;
            predictBtn.innerHTML =
                '<span aria-hidden="true">▶</span> Calculate probability';
        }
    }

    function resetInputs() {
        fields.targetRuns.value = DEFAULTS.targetRuns;
        fields.currentScore.value = DEFAULTS.currentScore;
        fields.oversCompleted.value = DEFAULTS.oversCompleted.toFixed(1);
        fields.wicketsLost.value = DEFAULTS.wicketsLost;
        fields.runsLast30.value = DEFAULTS.runsLast30;
        fields.wicketsLast30.value = DEFAULTS.wicketsLast30;

        calculateProbability();
    }

    buildGauge();
    updateGauge(40.9);

    predictBtn.addEventListener("click", calculateProbability);
    resetBtn.addEventListener("click", resetInputs);

    // Important: intentionally no input/change listeners here.
    // Derived match-state values change only after Calculate Probability.
    calculateProbability();
});
