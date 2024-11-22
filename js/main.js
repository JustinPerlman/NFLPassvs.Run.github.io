import { ScrollManager } from './scroll.js';
import { PlayDistributionVis } from './visualizations/playDistribution.js';
import { SituationalSuccessVis } from './visualizations/situationalSuccess.js';
import { GameContextVis } from './visualizations/gameContext.js';
import { TurnoverLocationVis } from './visualizations/turnoverLocation.js';

class App {
    constructor() {
        this.visualizations = {
            'distribution': new PlayDistributionVis(),
            'yards': new SituationalSuccessVis(),
            'gameContext': new GameContextVis(),
            'situation': new TurnoverLocationVis()
        };
    }

    async init() {
        try {
            // Initialize scroll dots first
            initializeScrollDots();
            
            // Then create scroll manager
            this.scrollManager = new ScrollManager();
            
            // Load data and initialize visualizations
            const data = await d3.csv('../datamini.csv');
            
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
                this.scrollManager.addScene(id, () => {
                    if (typeof this.visualizations[id].update === 'function') {
                        this.visualizations[id].update();
                    }
                });
            }
        });
    }
}

// Initialize scroll dots with section titles
function initializeScrollDots() {
    const sectionTitles = {
        'intro': 'Introduction',
        'distribution': 'Play Distribution',
        'yards': 'Yards Gained',
        'outcome': 'Coming Soon',
        'situation': 'Turnover Location Analysis',
        'gameContext': 'Game Context Analysis',
        'conclusions': 'Conclusions'
    };
    
    document.querySelectorAll('.dots-nav a').forEach(dot => {
        const section = dot.getAttribute('data-section');
        const title = sectionTitles[section];
        if (title) {
            dot.setAttribute('data-title', title);
            dot.setAttribute('title', title); // Add title attribute for native tooltip
        }
    });
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
