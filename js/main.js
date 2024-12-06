import { ScrollManager } from './scroll.js';
import { TeamPerformanceVis } from './visualizations/teamPerformance.js';
import { PlayOutcomeVis } from './visualizations/playOutcome.js';
import { GameContextVis } from './visualizations/gameContext.js';
import { TurnoverLocationVis } from './visualizations/turnoverLocation.js';
import { ScoringDriveVis } from './visualizations/scoringDrive.js';

class App {
    constructor() {
        this.visualizations = {
            'distribution': new TeamPerformanceVis(),
            'outcome': new PlayOutcomeVis(),
            'scoring': new ScoringDriveVis(),
            'turnover': new TurnoverLocationVis(),
            'gameContext': new GameContextVis()
        };
    }

    async init() {
        try {
            // Initialize scroll dots
            initializeScrollDots();
            
            // Create scroll manager
            this.scrollManager = new ScrollManager();
            
            // Load data
            const data = await d3.csv('./datamini.csv');
            
            // Initialize each visualization with the data
            for (const [id, vis] of Object.entries(this.visualizations)) {
                if (typeof vis.initialize === 'function') {
                    await vis.initialize(data);
                } else if (typeof vis.create === 'function') {
                    await vis.create(data);
                } else {
                    console.warn(`No initialization method found for visualization: ${id}`);
                }
            }

            // Set up scroll tracking without updates
            this.initializeScrolling();
        } catch (error) {
            console.error('Error initializing application:', error);
        }
    }

    initializeScrolling() {
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            const id = section.id;
            if (this.visualizations[id]) {
                this.scrollManager.addScene(id, () => {});
            }
        });
    }
}

// Initialize scroll dots
function initializeScrollDots() {
    const sectionTitles = {
        'intro': 'Introduction',
        'distribution': 'Team Performance',
        'outcome': 'Play Outcome Breakdown',
        'scoring': 'Scoring Drive Distribution',
        'turnover': 'Turnover Location',
        'gameContext': 'Game Context Analysis',
        'conclusions': 'Conclusions'
    };
    
    document.querySelectorAll('.dots-nav a').forEach(dot => {
        const section = dot.getAttribute('data-section');
        const title = sectionTitles[section];
        if (title) {
            dot.setAttribute('data-title', title);
            dot.setAttribute('title', title);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
