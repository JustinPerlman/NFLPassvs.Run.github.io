//#region Initialization
let globalData = [];

const nflTeamAbbrvs = [
    "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN",
    "DET", "GB", "HOU", "IND", "JAC", "KC", "LV", "LAC", "LAR", "MIA", 
    "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SF", "SEA", "TB", 
    "TEN", "WAS"
];
 
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
    chart.innerHTML = ""; // Clear any placeholder text or existing content.

    // Process the data to sum pass and rush yards for each team
    const playData = processPlayData(globalData);

    // Create the grouped bar chart
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#pass-rush-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand()
        .domain(playData.map(d => d.team))
        .range([0, width])
        .padding(0.2);

    const x1 = d3.scaleBand()
        .domain(['pass', 'rush'])
        .range([0, x0.bandwidth()])
        .padding(0.05);

    const y = d3.scaleLinear()
        .domain([0, d3.max(playData, d => Math.max(d.avgPassYards, d.avgRushYards))])
        .nice()
        .range([height, 0]);

    const color = d3.scaleOrdinal()
        .domain(['pass', 'rush'])
        .range(["#1f77b4", "#ff7f0e"]);

    svg.append("g")
        .selectAll("g")
        .data(playData)
        .enter()
        .append("g")
        .attr("transform", d => `translate(${x0(d.team)}, 0)`)
        .selectAll("rect")
        .data(d => [
        { type: 'pass', y: d.avgPassYards },
        { type: 'rush', y: d.avgRushYards }
        ])
        .enter()
        .append("rect")
        .attr("x", d => x1(d.type))
        .attr("y", d => y(d.y))
        .attr("width", x1.bandwidth())
        .attr("height", d => height - y(d.y))
        .attr("fill", d => color(d.type));

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x0));

    svg.append("g")
        .call(d3.axisLeft(y));

	// Add x-axis label
	svg.append("text")
		.attr("transform", `translate(${width / 2}, ${height + margin.top + 20})`)
		.style("text-anchor", "middle")
		.text("Team (orange = rush, blue = pass)");

	// Add y-axis label
	svg.append("text")
		.attr("transform", "rotate(-90)")
		.attr("y", 0 - margin.left)
		.attr("x", 0 - (height / 2))
		.attr("dy", "1em")
		.style("text-anchor", "middle")
		.text("Average Yards Gained");
}

function processPlayData(data) {
    const teamsData = {};

    // Aggregate yards by play type and team
    data.forEach(play => {
        const team = play.posteam;
        const playType = play.play_type;
        var yards = 0;

        // Only process if yards_gained is not 'NA'
        if (play.yards_gained !== 'NA') {
            yards = play.yards_gained;
        }

        // Only process teams that are in the 'teams' array
        if (nflTeamAbbrvs.includes(team)) {
            if (!teamsData[team]) {
                teamsData[team] = { passYards: 0, rushYards: 0, passPlays: 0, rushPlays: 0 };
            }

            // Aggregate yards based on play type and count the number of plays
            if (playType === "pass") {
                teamsData[team].passYards += yards;
                teamsData[team].passPlays += 1;
            } else if (playType === "run") {
                teamsData[team].rushYards += yards;
                teamsData[team].rushPlays += 1;
            }
        }
    });

    console.log("Teams Data:", teamsData);

    // Convert the teams data into an array of objects with average yards per play
    return Object.entries(teamsData).map(([team, stats]) => {
        const avgPassYards = stats.passPlays > 0 ? stats.passYards / stats.passPlays : 0;
        const avgRushYards = stats.rushPlays > 0 ? stats.rushYards / stats.rushPlays : 0;

        return {
            team,
            avgPassYards,
            avgRushYards
        };
    });
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