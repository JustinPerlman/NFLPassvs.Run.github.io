import { ScrollManager } from './scroll.js';
import { PlayDistributionVis } from './visualizations/playDistribution.js';
import { SituationalSuccessVis } from './visualizations/situationalSuccess.js';
import { GameContextVis } from './visualizations/gameContext.js';

class App {
    constructor() {
        this.scrollManager = new ScrollManager();
        this.data = null;
        this.visualizations = {
            'distribution': new PlayDistributionVis(),
            'yards': new SituationalSuccessVis(),
            'gameContext': new GameContextVis()
        };
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
                score_differential: +d.score_differential,
                yardline_100: +d.yardline_100,
                qtr: +d.qtr
            }));
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async initVisualizations() {
        // Create each visualization with the data
        for (const [name, vis] of Object.entries(this.visualizations)) {
            try {
                if (name === 'gameContext') {
                    await vis.initialize();
                } else {
                    await vis.create(this.data);
                }
            } catch (error) {
                console.error(`Error initializing ${name} visualization:`, error);
            }
        }
    }

    initializeScrolling() {
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            const id = section.id;
            if (this.visualizations[id]) {
                this.scrollManager.addScene(id, () => {
                    this.visualizations[id].update();
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
        'situation': 'Coming Soon',
        'gameContext': 'Game Context Analysis',
        'conclusions': 'Conclusions'
    };
    
    document.querySelectorAll('.dots-nav a').forEach(dot => {
        const section = dot.getAttribute('data-section');
        dot.setAttribute('data-title', sectionTitles[section]);
    });
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeScrollDots();
    const app = new App();
    app.init();
});
