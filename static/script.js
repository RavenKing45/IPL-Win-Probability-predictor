const predictButton = document.getElementById("predict-btn");
const result = document.getElementById("result");
const errorMessage = document.getElementById("error");


predictButton.addEventListener("click", async () => {

    errorMessage.textContent = "";

    const target = Number(document.getElementById("target").value);
    const score = Number(document.getElementById("score").value);
    const overs = Number(document.getElementById("overs").value);
    const wickets = Number(document.getElementById("wickets").value);
    const runsLast30 = Number(
        document.getElementById("runs-last-30").value
    );
    const wicketsLast30 = Number(
        document.getElementById("wickets-last-30").value
    );


    // Basic frontend validation

    if (
        !target ||
        Number.isNaN(score) ||
        Number.isNaN(overs) ||
        Number.isNaN(wickets) ||
        Number.isNaN(runsLast30) ||
        Number.isNaN(wicketsLast30)
    ) {
        errorMessage.textContent = "Please fill in all fields.";
        return;
    }


    if (score >= target) {
        errorMessage.textContent =
            "Current score cannot be greater than or equal to the target.";
        return;
    }


    predictButton.disabled = true;
    predictButton.textContent = "Calculating...";


    try {

        const response = await fetch("/api/predict", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                target_runs: target,
                current_score: score,
                overs_completed: overs,
                wickets_lost: wickets,
                runs_last_30: runsLast30,
                wickets_last_30: wicketsLast30
            })
        });


        const data = await response.json();


        if (!response.ok) {
            throw new Error(data.error || "Prediction failed.");
        }


        // Display result

        result.classList.remove("hidden");

        document.getElementById("probability").textContent =
            `${data.win_probability}%`;

        document.getElementById("win-probability").textContent =
            `${data.win_probability}%`;

        document.getElementById("loss-probability").textContent =
            `${data.loss_probability}%`;

        document.getElementById("probability-fill").style.width =
            `${data.win_probability}%`;


        // Display match statistics

        document.getElementById("runs-left").textContent =
            data.features.runs_left;

        document.getElementById("rrr").textContent =
            data.features.RRR;

        document.getElementById("crr").textContent =
            data.features.CRR;

        document.getElementById("wickets-left").textContent =
            data.features.wickets_left;


        result.scrollIntoView({
            behavior: "smooth"
        });

    } catch (error) {

        errorMessage.textContent = error.message;

    } finally {

        predictButton.disabled = false;
        predictButton.textContent = "Calculate Win Probability";

    }

});