//#region Initialization
let globalData = [];

// Load your visualizations dynamically
document.addEventListener("DOMContentLoaded", function () {
    loadCSVData("data.csv");
});

function loadCSVData(filePath) {
    d3.csv(filePath).then(function(data) {
        data.forEach(function(d) {
            // Loop through each key in the data and convert numerical values
            for (let key in d) {
                if (!isNaN(d[key]) && d[key] !== '') {
                    d[key] = parseFloat(d[key]); // Convert to float if it's a number
                }
            }
        });

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
//#endregion

//#region Vis 1
// Example function to create Pass vs Rush Chart
function createVis1() {
    const chart = document.getElementById("pass-rush-chart");
    
    // Process the data to count pass and rush plays
    const playCounts = processPlayData(globalData);

    // Create the bar chart
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = 400 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select("#pass-rush-chart")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(playCounts.map(d => d.type))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(playCounts, d => d.count)])
      .nice()
      .range([height, 0]);

    svg.append("g")
      .selectAll("rect")
      .data(playCounts)
      .enter()
      .append("rect")
      .attr("x", d => x(d.type))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.count))
      .attr("fill", "#69b3a2");

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .call(d3.axisLeft(y));
}

function processPlayData(data) {
    const playTypes = data.reduce((acc, play) => {
      if (play.play_type === "pass" || play.play_type === "run") {
        acc[play.play_type] = (acc[play.play_type] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(playTypes).map(([type, count]) => ({
      type,
      count
    }));
  }

//#endregion

//#region Vis 2
// Example function to create Situational Decision Map
function createVis2() {
    const chart = document.getElementById("decision-map");
    chart.innerHTML = "<p>This will be an interactive situational decision map.</p>";
    // Replace with actual decision map code
}
//#endregion

//#region Vis 3
// Example function to create Success Rate Chart
function createVis3() {
    const chart = document.getElementById("success-rate-chart");
    chart.innerHTML = "<p>This will show the success rates for different play types.</p>";
    // Replace with actual success rate chart code
}
//#endregion

//#region Vis 4
// Example function to create Field Position Danger Map
function createVis4() {
    const chart = document.getElementById("danger-map");
    chart.innerHTML = "<p>This will display the danger of plays based on field position.</p>";
    // Replace with actual danger map code
}
//#endregion

//#region Vis 5
// Example function to create Field Position Danger Map
function createVis5() {
    const chart = document.getElementById("danger-map2");
    chart.innerHTML = "<p>This will display the danger of plays based on field position.</p>";
    // Replace with actual danger map code
}
//#endregion