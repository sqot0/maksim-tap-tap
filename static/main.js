let localClickCount = 0;
let intervalClickCount = 0;

async function sendClickData(userId, clickCount) {
    try {
        const response = await fetch('/api/click', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, clickCount })
        });

        if (response.status === 429) {
            console.warn('Request rate limited. Try again later.');
            return;
        }

        const data = await response.json();
        console.log('Data sent successfully:', data);
    } catch (error) {
        console.error('Error sending data:', error);
    }
}

async function readClickData(userId) {
    try {
        const response = await fetch(`/api/get-clicks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });
        const data = await response.json();
        return data.clicks;
    } catch (error) {
        console.error('Error reading data:', error);
        return 0;
    }
}

function showClickEffect(x, y) {
    const clickEffect = document.createElement('div');
    clickEffect.classList.add('click-effect');
    clickEffect.textContent = '+1';
    document.getElementById('clicker').appendChild(clickEffect);
    clickEffect.style.left = `${x}px`;
    clickEffect.style.top = `${y}px`;
    clickEffect.style.animation = "moveUpFadeOut 1s ease-out";
    setTimeout(() => {
        clickEffect.remove()
    }, 1000);
}

function initializeTelegram() {
    try {
        const tg = window.Telegram.WebApp;
        tg.expand();

        const user = tg.initDataUnsafe.user;

        if (user) {
            document.getElementById('user-name').textContent = `Привет, ${user.first_name}!`;
        } else {
            document.getElementById('user-name').textContent = 'Привет, Неизвестный!';
        }

        const clickBtn = document.getElementById('click-img');
        const clickCountDisplay = document.getElementById('click-count');

        readClickData(user.id).then(clickCount => {
            localClickCount = clickCount;
            clickCountDisplay.textContent = `Максимов: ${clickCount}`;

            clickBtn.addEventListener('click', (event) => {
                localClickCount++;
                intervalClickCount++;
                clickCountDisplay.textContent = `Максимов: ${localClickCount}`;

                const rect = clickBtn.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                showClickEffect(x, y);
            });

            setInterval(() => {
                if (intervalClickCount > 0) {
                    sendClickData(user.id, intervalClickCount);
                    intervalClickCount = 0;
                    readClickData(user.id).then(clickCount => {
                        localClickCount = clickCount;
                        clickCountDisplay.textContent = `Максимов: ${clickCount}`;
                    });
                }
            }, 5000);

            tg.MainButton.setText('Выйти в Телеграм');
            tg.MainButton.textColor = "#FFFFFF";
            tg.MainButton.color = "#4CAF50";
            tg.MainButton.show();
            tg.onEvent('mainButtonClicked', function() {
                sendClickData(user.id, intervalClickCount);
                intervalClickCount = 0;
                tg.close();
            });
        });
    } catch (error) {
        console.error('Error initializing Telegram Web App:', error);
        document.getElementById('user-name').textContent = 'Failed to initialize Telegram Web App!';
    }
}

document.addEventListener('DOMContentLoaded', initializeTelegram);