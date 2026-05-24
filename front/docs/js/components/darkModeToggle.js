export function setupDarkModeToggle() {
    const toggleButton = document.getElementById('darkModeToggle');
    const body = document.body;

    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
    } else if (savedTheme === 'light') {
        body.classList.remove('dark-mode');
    } else if (prefersDarkScheme.matches) {
        body.classList.add('dark-mode');
    }

    toggleButton.addEventListener('click', () => {
        body.classList.toggle('dark-mode');

        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    });
}
