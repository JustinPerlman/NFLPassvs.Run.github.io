export class ScrollManager {
    constructor() {
        this.sections = document.querySelectorAll('.section');
        this.dots = document.querySelectorAll('.dots-nav a');
        this.scenes = new Map();
        this.init();
    }

    init() {
        this.setupScrollListener();
        this.setupDotClickListeners();
    }

    addScene(sectionId, callback) {
        this.scenes.set(sectionId, callback);
    }

    setupScrollListener() {
        window.addEventListener('scroll', () => {
            this.updateActiveDot();
            this.checkAndTriggerScenes();
        });
    }

    setupDotClickListeners() {
        this.dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = document.querySelector(dot.getAttribute('href'));
                targetSection.scrollIntoView({ behavior: 'smooth' });
            });

            // Set the title attribute for hover text
            const sectionName = dot.getAttribute('data-section');
            const title = dot.getAttribute('data-title');
            if (title) {
                dot.setAttribute('title', title);
            }
        });
    }

    checkAndTriggerScenes() {
        const scrollPosition = window.scrollY;
        const windowHeight = window.innerHeight;

        this.sections.forEach(section => {
            const sectionId = section.id;
            const callback = this.scenes.get(sectionId);
            
            if (callback) {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                
                // Check if section is in view
                if (scrollPosition >= sectionTop - windowHeight/2 && 
                    scrollPosition < sectionTop + sectionHeight - windowHeight/2) {
                    callback();
                }
            }
        });
    }

    updateActiveDot() {
        const scrollPosition = window.scrollY;
        
        this.sections.forEach((section, index) => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (scrollPosition >= sectionTop - sectionHeight / 3) {
                this.dots.forEach(dot => dot.classList.remove('active'));
                this.dots[index].classList.add('active');
            }
        });
    }
}
