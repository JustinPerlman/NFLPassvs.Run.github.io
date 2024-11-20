import { ScrollManager } from './scroll.js';
import { PlayDistributionVis } from './visualizations/playDistribution.js';
import { SituationalSuccessVis } from './visualizations/situationalSuccess.js';
import { FieldPositionVis } from './visualizations/fieldPosition.js';
import { ScoringSituationVis } from './visualizations/scoringSituation.js';
import { PlayOutcomeVis } from './visualizations/playOutcome.js';
import { GameSituationVis } from './visualizations/gameSituation.js';

class App {
    constructor() {
        this.scrollManager = new ScrollManager();
        this.visualizations = {};
        this.data = null;
        this.filters = {
            year: 'all',
            team: 'all'
        };
    }

    async loadData() {
        const data = await d3.csv('data.csv');
        return data.map(d => ({
            ...d,
            yards_gained: +d.yards_gained,
            down: +d.down,
            yard_line: +d.yard_line,
            yards_to_go: +d.yards_to_go,
            score_differential: +d.score_differential
        }));
    }

    setupFilters() {
        const years = [...new Set(this.data.map(d => d.year))].sort();
        const teams = [...new Set(this.data.map(d => d.team))].sort();

        this.populateFilter('yearFilter', years);
        this.populateFilter('teamFilter', teams);

        // Add event listeners
        document.getElementById('yearFilter').addEventListener('change', () => this.updateVisualizations());
        document.getElementById('teamFilter').addEventListener('change', () => this.updateVisualizations());
    }

    populateFilter(filterId, options) {
        const select = document.getElementById(filterId);
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
    }

    getFilteredData() {
        return this.data.filter(d => {
            const yearMatch = this.filters.year === 'all' || d.year === this.filters.year;
            const teamMatch = this.filters.team === 'all' || d.team === this.filters.team;
            return yearMatch && teamMatch;
        });
    }

    updateFilters() {
        this.filters.year = document.getElementById('yearFilter').value;
        this.filters.team = document.getElementById('teamFilter').value;
    }

    async updateVisualizations() {
        this.updateFilters();
        const filteredData = this.getFilteredData();
        
        // Update each visualization with filtered data
        Object.values(this.visualizations).forEach(vis => {
            vis.create(filteredData);
        });
    }

    async initVisualizations() {
        // Initialize each visualization class
        this.visualizations = {
            playDistribution: new PlayDistributionVis(),
            situationalSuccess: new SituationalSuccessVis(),
            fieldPosition: new FieldPositionVis(),
            scoringSituation: new ScoringSituationVis(),
            playOutcome: new PlayOutcomeVis(),
            gameSituation: new GameSituationVis()
        };

        const filteredData = this.getFilteredData();
        
        // Create each visualization
        for (const vis of Object.values(this.visualizations)) {
            await vis.create(filteredData);
        }
    }

    async init() {
        try {
            // Load data first
            this.data = await this.loadData();
            
            // Setup filters
            this.setupFilters();
            
            // Initialize visualizations
            await this.initVisualizations();
            
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Error initializing application:', error);
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
