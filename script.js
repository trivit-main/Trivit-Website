const authModuleUrl = new URL('auth.js', document.currentScript.src);

document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.site-header');
    if (!header) return;

    header.insertAdjacentHTML('afterend', `
        <dialog class="auth-window" id="auth-panel" aria-labelledby="auth-title">
            <div class="window-bar">
                <h2 class="window-title" id="auth-title">Log in to Trivit</h2>
                <button class="control window-close" type="button" aria-label="Close login window">
                    <span class="control-face" aria-hidden="true"></span>
                </button>
            </div>
            <form class="window-body auth-form" id="auth-login-form" data-auth-mode="login">
                <label class="auth-field" for="auth-email">
                    Email
                    <input id="auth-email" name="email" type="email" autocomplete="email" required autofocus>
                </label>
                <label class="auth-field" for="auth-password">
                    Password
                    <input id="auth-password" name="password" type="password" autocomplete="current-password" required>
                </label>
                <button class="control control-primary auth-submit" type="submit"><span class="control-face">LOG IN</span></button>
                <div class="auth-provider-separator" aria-hidden="true">or</div>
                <button class="control auth-google-button" type="button"><span class="control-face">LOG IN WITH GOOGLE</span></button>
                <div class="auth-mode-switch">
                    <span class="auth-mode-label">Don't have an account?</span>
                    <button class="control auth-mode-toggle" type="button"><span class="control-face">SIGN UP</span></button>
                </div>
                <p class="auth-feedback" role="status"></p>
            </form>
        </dialog>
        <dialog class="auth-window" id="account-panel" aria-labelledby="account-title">
            <div class="window-bar">
                <h2 class="window-title" id="account-title">Hello, User!</h2>
                <button class="control window-close" type="button" aria-label="Close account window">
                    <span class="control-face" aria-hidden="true"></span>
                </button>
            </div>
            <div class="window-body">
                <p class="account-copy">Choose what you want to open next.</p>
                <div class="account-menu-list">
                    <button class="control" type="button"><span class="control-face">Profile</span></button>
                    <button class="control" type="button"><span class="control-face">Saved Items</span></button>
                    <button class="control" type="button"><span class="control-face">Downloads</span></button>
                    <button class="control" type="button"><span class="control-face">Settings</span></button>
                    <button class="control control-primary account-menu-logout" type="button"><span class="control-face">Log Out</span></button>
                </div>
                <p class="account-feedback" role="status"></p>
            </div>
        </dialog>
    `);

    const authTrigger = header.querySelector('.auth-trigger');
    const authPanel = document.querySelector('#auth-panel');
    const accountPanel = document.querySelector('#account-panel');
    const authForm = document.querySelector('#auth-login-form');
    const authTitle = document.querySelector('#auth-title');
    const authPassword = document.querySelector('#auth-password');
    const authSubmit = document.querySelector('.auth-submit');
    const authGoogleButton = document.querySelector('.auth-google-button');
    const authModeLabel = document.querySelector('.auth-mode-label');
    const authModeToggle = document.querySelector('.auth-mode-toggle');
    const accountFeedback = document.querySelector('.account-feedback');
    const accountLogoutButton = document.querySelector('.account-menu-logout');

    let isAuthenticated = false;
    let navigationToken = 0;

    function syncDialogState() {
        const isOpen = authPanel.open || accountPanel.open;
        authTrigger.setAttribute('aria-expanded', String(isOpen));
        document.body.classList.toggle('auth-open', isOpen);
    }

    function syncAuthMode(mode) {
        const isRegistering = mode === 'register';
        authForm.dataset.authMode = isRegistering ? 'register' : 'login';
        authTitle.textContent = isRegistering ? 'Create a Trivit account' : 'Log in to Trivit';
        authPassword.autocomplete = isRegistering ? 'new-password' : 'current-password';
        authModeLabel.textContent = isRegistering ? 'Already have an account?' : "Don't have an account?";

        if (!authSubmit.disabled) {
            authSubmit.firstElementChild.textContent = isRegistering ? 'SIGN UP' : 'LOG IN';
            authGoogleButton.firstElementChild.textContent = isRegistering ? 'SIGN UP WITH GOOGLE' : 'LOG IN WITH GOOGLE';
            authModeToggle.firstElementChild.textContent = isRegistering ? 'LOG IN' : 'SIGN UP';
        }
    }

    function closeAuthPanel() {
        if (!authPanel.open) return;
        authPanel.close();
        syncDialogState();
        document.dispatchEvent(new CustomEvent('trivit:auth-panel-close'));
    }

    function setLogoutState(isPending, message = '', state = '') {
        accountLogoutButton.disabled = isPending;
        accountLogoutButton.firstElementChild.textContent = isPending ? 'Logging Out...' : 'Log Out';
        accountFeedback.textContent = message;
        accountFeedback.dataset.state = state;
    }

    function closeAccountPanel() {
        if (!accountPanel.open) return;
        accountPanel.close();
        setLogoutState(false);
        syncDialogState();
        document.dispatchEvent(new CustomEvent('trivit:account-panel-close'));
    }

    function openAuthPanel() {
        if (authPanel.open) return;
        closeAccountPanel();
        syncAuthMode('login');
        authPanel.showModal();
        syncDialogState();
        document.dispatchEvent(new CustomEvent('trivit:auth-panel-open'));
    }

    function openAccountPanel() {
        closeAuthPanel();
        setLogoutState(false);
        accountPanel.showModal();
        syncDialogState();
        document.dispatchEvent(new CustomEvent('trivit:account-panel-open'));
    }

    function bindDismissal(panel, closePanel) {
        panel.querySelector('.window-close').addEventListener('click', closePanel);
        panel.addEventListener('cancel', event => {
            event.preventDefault();
            closePanel();
        });
        panel.addEventListener('click', event => {
            if (event.target !== panel) return;
            const bounds = panel.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right ||
                event.clientY < bounds.top || event.clientY > bounds.bottom) {
                closePanel();
            }
        });
    }

    bindDismissal(authPanel, closeAuthPanel);
    bindDismissal(accountPanel, closeAccountPanel);

    authTrigger.addEventListener('click', () => {
        authTrigger.focus({ preventScroll: true });
        if (isAuthenticated) {
            openAccountPanel();
        } else {
            openAuthPanel();
        }
    });

    authModeToggle.addEventListener('click', () => {
        const mode = authForm.dataset.authMode === 'register' ? 'login' : 'register';
        document.dispatchEvent(new CustomEvent('trivit:auth-mode-change', { detail: { mode } }));
    });

    document.addEventListener('trivit:auth-mode-change', event => syncAuthMode(event.detail?.mode));
    document.addEventListener('trivit:auth-login-success', () => {
        if (isAuthenticated) closeAuthPanel();
    });
    document.addEventListener('trivit:request-auth-panel-open', openAuthPanel);
    document.addEventListener('trivit:request-auth-panel-close', closeAuthPanel);

    document.addEventListener('trivit:auth-state-change', event => {
        isAuthenticated = Boolean(event.detail?.isAuthenticated);
        authTrigger.firstElementChild.textContent = isAuthenticated ? 'You' : 'LOG IN';
        authTrigger.setAttribute('aria-controls', isAuthenticated ? 'account-panel' : 'auth-panel');

        if (isAuthenticated) {
            closeAuthPanel();
        } else {
            closeAccountPanel();
        }
    });

    accountLogoutButton.addEventListener('click', () => {
        setLogoutState(true, 'Signing out...', 'pending');
        document.dispatchEvent(new CustomEvent('trivit:auth-logout-request'));
    });

    document.addEventListener('trivit:auth-logout-error', event => {
        setLogoutState(false, event.detail?.message || 'Logout failed. Please try again.', 'error');
    });

    function syncNavigation(nextDocument) {
        const nextLinks = nextDocument.querySelectorAll('.site-header a');
        header.querySelectorAll('a').forEach((link, index) => {
            const nextLink = nextLinks[index];
            if (!nextLink) return;

            link.setAttribute('href', nextLink.getAttribute('href'));
            if (nextLink.hasAttribute('aria-current')) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }

    async function navigateTo(url, pushStateEntry = true) {
        const token = ++navigationToken;

        try {
            const response = await fetch(url.href, {
                headers: { 'X-Requested-With': 'trivit-navigation' }
            });
            if (!response.ok) throw new Error(`Navigation failed with status ${response.status}`);

            const html = await response.text();
            if (token !== navigationToken) return;

            const nextDocument = new DOMParser().parseFromString(html, 'text/html');
            const nextMain = nextDocument.querySelector('main');
            if (!nextMain) throw new Error('Target page has no main content to swap.');

            if (pushStateEntry) {
                history.pushState({}, '', url.pathname + url.search + url.hash);
            }

            document.title = nextDocument.title || document.title;
            syncNavigation(nextDocument);
            document.querySelector('main').replaceWith(nextMain);
            window.scrollTo(0, 0);
        } catch {
            if (token === navigationToken) window.location.href = url.href;
        }
    }

    document.addEventListener('click', event => {
        const link = event.target.closest('.site-header a[href]');
        if (!link || event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (link.target && link.target !== '_self') return;
        if (link.hasAttribute('download')) return;

        const url = new URL(link.href);
        if (url.origin !== window.location.origin) return;

        event.preventDefault();
        if (url.href !== window.location.href) {
            navigateTo(url);
        } else {
            // Cancel any pending navigation to a different page.
            navigationToken++;
        }
    });

    window.addEventListener('popstate', () => navigateTo(new URL(window.location.href), false));

    const authModule = document.createElement('script');
    authModule.type = 'module';
    authModule.src = authModuleUrl.href;
    document.body.appendChild(authModule);
});
