document.addEventListener('DOMContentLoaded', () => {
    initCustomCursor();
    initAntigravityCanvas();
    initScrollReveal();
});

// --- Custom Cursor ---
function initCustomCursor() {
    const cursorDot = document.createElement('div');
    const cursorRing = document.createElement('div');

    cursorDot.className = 'custom-cursor-dot';
    cursorRing.className = 'custom-cursor-ring';

    document.body.appendChild(cursorDot);
    document.body.appendChild(cursorRing);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Immediate update for dot
        cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    });

    // Lagging effect for ring
    function animateCursor() {
        // Lerp
        ringX += (mouseX - ringX) * 0.15;
        ringY += (mouseY - ringY) * 0.15;
        
        cursorRing.style.transform = `translate(${ringX}px, ${ringY}px)`;
        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Hover scale effect
    const interactiveElements = document.querySelectorAll('a, button, input, textarea, .hover-target');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursorRing.style.width = '60px';
            cursorRing.style.height = '60px';
            cursorRing.style.marginLeft = '-30px';
            cursorRing.style.marginTop = '-30px';
            cursorRing.style.background = 'rgba(201, 169, 110, 0.1)';
        });
        el.addEventListener('mouseleave', () => {
            cursorRing.style.width = '40px';
            cursorRing.style.height = '40px';
            cursorRing.style.marginLeft = '-20px';
            cursorRing.style.marginTop = '-20px';
            cursorRing.style.background = 'transparent';
        });
    });
}

// --- Antigravity Particle System ---
function initAntigravityCanvas() {
    const canvas = document.getElementById('antigravityCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let particles = [];
    const numParticles = 90;
    
    let mouse = { x: -1000, y: -1000 };
    const interactionRadius = 150;
    const connectionRadius = 120;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    
    window.addEventListener('mouseout', () => {
        mouse.x = -1000;
        mouse.y = -1000;
    });

    class Particle {
        constructor() {
            this.reset(true);
        }

        reset(randomY = false) {
            this.x = Math.random() * width;
            this.y = randomY ? Math.random() * height : height + 20;
            this.size = Math.random() * 2 + 1;
            this.baseX = this.x;
            this.baseY = this.y;
            
            // Movement physics
            this.speedY = -(Math.random() * 0.5 + 0.2); // Upward drift
            this.angle = Math.random() * Math.PI * 2;
            this.wobbleSpeed = Math.random() * 0.02 + 0.01;
            this.wobbleDistance = Math.random() * 30 + 10;
        }

        update() {
            // Apply drift
            this.baseY += this.speedY;
            
            // Apply wobble
            this.angle += this.wobbleSpeed;
            this.x = this.baseX + Math.sin(this.angle) * this.wobbleDistance;
            this.y = this.baseY;

            // Reset if out of bounds (top)
            if (this.y < -50) {
                this.reset(false);
            }

            // Mouse Repulsion
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < interactionRadius) {
                const forceDirectionX = dx / dist;
                const forceDirectionY = dy / dist;
                const force = (interactionRadius - dist) / interactionRadius; // 0 to 1
                
                // Push away
                const pushStrength = 5;
                this.baseX -= forceDirectionX * force * pushStrength;
                this.baseY -= forceDirectionY * force * pushStrength;
            }
        }

        draw() {
            // Radial Glow
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 4);
            // Using Mist (#e2e8f0) and Gold (#c9a96e) loosely for glow
            gradient.addColorStop(0, 'rgba(201, 169, 110, 0.4)'); // Gold tint glow
            gradient.addColorStop(1, 'rgba(201, 169, 110, 0)');
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 4, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Solid Center
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = '#c9a96e'; // Gold solid center
            ctx.fill();
        }
    }

    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Update and draw particles
        particles.forEach(p => {
            p.update();
            p.draw();
        });

        // Draw connection lines
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < connectionRadius) {
                    const opacity = 1 - (dist / connectionRadius);
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(201, 169, 110, ${opacity * 0.2})`; // Subtle gold lines
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animate);
    }
    animate();
}

// --- Scroll Reveal ---
function initScrollReveal() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-revealed');
                // Optional: stop observing once revealed
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach(el => observer.observe(el));
}
