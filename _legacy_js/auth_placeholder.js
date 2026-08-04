(function() {
    try {
        const email = localStorage.getItem('allergyguide_user_email');
        if (email) {
            const loadingHtml = `
            <div style="text-align: center; padding: 2rem;">
            <svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="fill: var(--core-primary, #007bff); margin-bottom: 1rem; animation: workspace-spin 1.5s linear infinite;">
            <style>
            @keyframes workspace-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
            <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
            </svg>
            <h3 style="margin-bottom: 0.5rem;">Loading Workspace...</h3>
            <p><strong>${email}</strong>...</p>
            </div>
            `;

            const restrictedCard = document.querySelector('.restricted-card');
            if (restrictedCard) {
                restrictedCard.dataset.originalHtml = restrictedCard.innerHTML;
                restrictedCard.innerHTML = loadingHtml;
            }

            const instructions = document.querySelector('.ofc-instructions');
            if (instructions) {
                instructions.dataset.originalHtml = instructions.innerHTML;
                instructions.innerHTML = loadingHtml;
            }
        }
    }
    catch (e) {}
})();
