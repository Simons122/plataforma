window.onerror = function (message, source, lineno, colno, error) {
    const box = document.createElement('div');
    box.style.position = 'fixed';
    box.style.top = '0';
    box.style.left = '0';
    box.style.width = '100%';
    box.style.height = '100%';
    box.style.backgroundColor = 'rgba(0,0,0,0.9)';
    box.style.color = 'red';
    box.style.padding = '20px';
    box.style.zIndex = '999999';
    box.innerHTML = `
    <h1>Critical Error</h1>
    <p>${message}</p>
    <p>${source}:${lineno}</p>
    <pre>${error?.stack}</pre>
  `;
    document.body.appendChild(box);
};
console.log("Debug script loaded");
