export function setupDarkModeToggle() {
    const toggleButton = document.getElementById('darkModeToggle');
    const body = document.body;
    if (!toggleButton) return;

    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
    } else if (savedTheme === 'light') {
        body.classList.remove('dark-mode');
    } else if (prefersDarkScheme.matches) {
        body.classList.add('dark-mode');
    }

    const updateButtonState = () => {
        const isDark = body.classList.contains('dark-mode');
        toggleButton.textContent = isDark ? 'Light' : 'Dark';
        toggleButton.setAttribute('aria-label', isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え');
    };

    updateButtonState();

    toggleButton.addEventListener('click', () => {
        body.classList.toggle('dark-mode');

        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
        updateButtonState();
        window.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme: body.classList.contains('dark-mode') ? 'dark' : 'light' },
        }));
    });
}
