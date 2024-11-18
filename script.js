let globalData = [];

// Load your visualizations dynamically
document.addEventListener("DOMContentLoaded", function () {
    loadCSVData("data.csv");
});

function loadCSVData(filePath) {
    d3.csv(filePath).then(function(data) {
        /* data.forEach(function(d) {
            // Loop through each key in the data and convert numerical values
            for (let key in d) {
                if (!isNaN(d[key]) && d[key] !== '') {
                    d[key] = parseFloat(d[key]); // Convert to float if it's a number
                }
            }
        }); */

        globalData = data;
        console.log("Parsed CSV Data Header:", globalData.slice(0, 3));
        initializeChart();
    }).catch(function(error) {
        console.error("Error loading CSV:", error);
    });
}

function initializeChart() {
    if (globalData.length > 0) {
        console.log("Data ready for visualizations.");
        createVis1();
        createVis2();
        createVis3();
        createVis4();
        createVis5();
    } else {
        console.log("No data available.");
    }
}

// Example function to create Pass vs Rush Chart
function createVis1() {
    const chart = document.getElementById("pass-rush-chart");
    // Placeholder code to simulate chart rendering
    chart.innerHTML = "<p>This will be a chart showing pass vs rush play distribution.</p>";
    // Replace with actual chart creation code (D3.js, Chart.js, etc.)
}

// Example function to create Situational Decision Map
function createVis2() {
    const chart = document.getElementById("decision-map");
    chart.innerHTML = "<p>This will be an interactive situational decision map.</p>";
    // Replace with actual decision map code
}

// Example function to create Success Rate Chart
function createVis3() {
    const chart = document.getElementById("success-rate-chart");
    chart.innerHTML = "<p>This will show the success rates for different play types.</p>";
    // Replace with actual success rate chart code
}

// Example function to create Field Position Danger Map
function createVis4() {
    const chart = document.getElementById("danger-map");
    chart.innerHTML = "<p>This will display the danger of plays based on field position.</p>";
    // Replace with actual danger map code
}

// Example function to create Field Position Danger Map
function createVis5() {
    const chart = document.getElementById("danger-map2");
    chart.innerHTML = "<p>This will display the danger of plays based on field position.</p>";
    // Replace with actual danger map code
}