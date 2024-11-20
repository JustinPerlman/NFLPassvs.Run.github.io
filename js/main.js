import { ScrollManager } from './scroll.js';
import { PlayDistributionVis } from './visualizations/playDistribution.js';
import { SituationalSuccessVis } from './visualizations/situationalSuccess.js';
import { ScoringSituationVis } from './visualizations/scoringSituation.js';
import { PlayOutcomeVis } from './visualizations/playOutcome.js';
import { GameSituationVis } from './visualizations/gameSituation.js';

class App {
    constructor() {
        this.scrollManager = new ScrollManager();
        this.data = null;
        this.visualizations = {};
    }

    async init() {
        await this.loadData();
        await this.initVisualizations();
        this.scrollManager.init();
    }

    async loadData() {
        try {
            this.data = await d3.csv('datamini.csv', d => ({
                ...d,
                yards_gained: +d.yards_gained,
                down: +d.down,
                yards_to_go: +d.yards_to_go,
                score_differential: +d.score_differential
            }));
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async initVisualizations() {
        // Initialize each visualization class
        this.visualizations = {
            playDistribution: new PlayDistributionVis(),
            situationalSuccess: new SituationalSuccessVis(),
            scoringSituation: new ScoringSituationVis(),
            playOutcome: new PlayOutcomeVis(),
            gameSituation: new GameSituationVis()
        };

        // Create each visualization with the data
        for (const vis of Object.values(this.visualizations)) {
            await vis.create(this.data);
        }
    }
}

// Initialize scroll dots with section titles
function initializeScrollDots() {
    const sections = {
        'intro': 'Introduction',
        'distribution': 'Team Performance',
        'yards': 'Situational Success',
        'scoring': 'Scoring Analysis',
        'outcome': 'Play Outcomes',
        'situation': 'Game Situations'
    };
    
    document.querySelectorAll('.dots-nav a').forEach(dot => {
        const section = dot.getAttribute('data-section');
        dot.setAttribute('data-title', sections[section]);
    });
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeScrollDots();
    const app = new App();
    app.init();
});
