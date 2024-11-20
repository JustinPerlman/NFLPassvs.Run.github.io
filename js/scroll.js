export class ScrollManager {
    constructor() {
        this.sections = document.querySelectorAll('.section');
        this.dots = document.querySelectorAll('.dots-nav a');
        this.init();
    }

    init() {
        this.setupScrollListener();
        this.setupDotClickListeners();
    }

    setupScrollListener() {
        window.addEventListener('scroll', () => this.updateActiveDot());
    }

    setupDotClickListeners() {
        this.dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = document.querySelector(dot.getAttribute('href'));
                targetSection.scrollIntoView({ behavior: 'smooth' });
            });
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
