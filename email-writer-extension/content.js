console.log("Email Writer Extension - Content Script Loaded");

// Create AI Reply button
function createAIButton() {
    const button = document.createElement('div');
    button.className = 'T-I J-J5-Ji aoO v7 T-I-atl L3';
    button.style.marginRight = '8px';
    button.style.backgroundColor = '#0b57d0';
    button.style.borderRadius = '20px';
    button.innerHTML = 'AI Reply';
    button.setAttribute('role', 'button');
    button.setAttribute('data-tooltip', 'Generate AI Reply');
    return button;
}

// Function to get email content from different selectors
function getEmailContent() {
    const selectors = ['.h7', '.a3s.aiL', '.gmail_quote', '[role="presentation"]'];
    for (const selector of selectors) {
        const content = document.querySelector(selector);
        if (content) {
            return content.innerText.trim();
        }
    }
    return '';
}

// Find compose toolbar
function findComposeToolbar() {
    const selectors = ['.btC', '.aDh', '[role="toolbar"]', '.gU.Up'];
    for (const selector of selectors) {
        const toolbar = document.querySelector(selector);
        if (toolbar) {
            return toolbar;
        }
    }
    return null;
}

// Create popup for tone selection
function createPopup(callback) {
    const existingPopup = document.querySelector('.ai-tone-popup');
    if (existingPopup) existingPopup.remove();

    const popup = document.createElement('div');
    popup.className = 'ai-tone-popup';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.background = 'white';
    popup.style.padding = '15px';
    popup.style.borderRadius = '8px';
    popup.style.boxShadow = '0px 0px 10px rgba(0,0,0,0.2)';
    popup.style.zIndex = '10000';

    popup.innerHTML = `
        <div style="width: 300px; padding: 20px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); background-color: #f9f9f9;">
        <h3 style="margin: 0 0 15px; font-family: Arial, sans-serif; color: #333;">Select Tone</h3>
        <select id="toneSelect" style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 5px; font-size: 16px;">
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="concise">Concise</option>
            <option value="empathetic">Empathetic</option>
        </select>
        <div style="display: flex; justify-content: space-between;">
            <button id="generateReply" style="background: #007BFF; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 16px; transition: background 0.3s;">
                Generate
            </button>
            <button id="closePopup" style="background: #ccc; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 16px; transition: background 0.3s;">
                Cancel
            </button>
        </div>
    </div>
    `;

    document.body.appendChild(popup);

    document.getElementById('generateReply').addEventListener('click', () => {
        const selectedTone = document.getElementById('toneSelect').value;
        document.body.removeChild(popup);
        callback(selectedTone);
    });

    document.getElementById('closePopup').addEventListener('click', () => {
        document.body.removeChild(popup);
    });
}

// Function to inject the button into Gmail's compose toolbar
function injectButton() {
    const existingButton = document.querySelector('.ai-reply-button');
    if (existingButton) existingButton.remove();

    const toolbar = findComposeToolbar();
    if (!toolbar) {
        console.log("Toolbar not found");
        return;
    }

    console.log("Toolbar found, creating AI button");
    const button = createAIButton();
    button.classList.add('ai-reply-button');

    button.addEventListener('click', async () => {
        createPopup(async (selectedTone) => {
            try {
                button.innerHTML = 'Generating...';
                button.disabled = true;

                const emailContent = getEmailContent();
                if (!emailContent) {
                    alert('No email content detected.');
                    throw new Error('No email content found.');
                }

                const response = await fetch('http://localhost:8080/api/email/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ emailContent, tone: selectedTone })
                });

                if (!response.ok) throw new Error('API Request Failed');

                const generatedReply = await response.text();
                const composeBox = document.querySelector('[role="textbox"][g_editable="true"]');

                if (composeBox) {
                    composeBox.focus();
                    document.execCommand('insertText', false, generatedReply);
                } else {
                    console.error('Compose box was not found');
                }
            } catch (error) {
                console.error(error);
                alert('Failed to generate reply');
            } finally {
                button.innerHTML = 'AI Reply';
                button.disabled = false;
            }
        });
    });

    toolbar.insertBefore(button, toolbar.firstChild);
}

// Observe Gmail's DOM changes and inject the button
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        const addedNodes = Array.from(mutation.addedNodes);
        const hasComposeElements = addedNodes.some(node =>
            node.nodeType === Node.ELEMENT_NODE && 
            (node.matches('.aDh, .btC, [role="dialog"]') || node.querySelector('.aDh, .btC, [role="dialog"]'))
        );

        if (hasComposeElements) {
            console.log("Compose Window Detected");
            setTimeout(injectButton, 500);
        }
    }
});

observer.observe(document.body, { childList: true, subtree: true });
