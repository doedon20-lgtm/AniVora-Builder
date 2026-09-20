const prompt = document.getElementById("prompt");
const generateBtn = document.getElementById("generateBtn");
const previewFrame = document.getElementById("previewFrame");
const statusText = document.getElementById("status");

const desktopBtn = document.getElementById("desktopBtn");
const mobileBtn = document.getElementById("mobileBtn");
const exportBtn = document.getElementById("exportBtn");

function renderWebsite(data) {

const html = `

<!DOCTYPE html><html>
<head><meta charset="UTF-8"><meta name="viewport"
content="width=device-width, initial-scale=1.0">

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  color: #151515;
}

.hero {
  min-height: 70vh;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background:
    linear-gradient(
      135deg,
      #eeeaff,
      #ffffff
    );
}

.hero h1 {
  max-width: 850px;
  font-size: clamp(38px, 7vw, 70px);
  line-height: 1;
  margin-bottom: 20px;
}

.hero p {
  max-width: 650px;
  color: #555;
  line-height: 1.7;
}

.hero button {
  margin-top: 15px;
  border: none;
  padding: 14px 24px;
  border-radius: 9px;
  background: #7c5cff;
  color: white;
  font-weight: bold;
}

.features {
  display: grid;
  grid-template-columns:
    repeat(3, 1fr);

  gap: 20px;
  padding: 60px 30px;
}

.feature {
  padding: 25px;
  border: 1px solid #ddd;
  border-radius: 12px;
}

.feature p {
  color: #666;
  line-height: 1.5;
}

@media(max-width:700px) {

  .features {
    grid-template-columns: 1fr;
  }

}

</style></head><body><section class="hero"><h1>
${escapeHtml(data.title)}
</h1><p>
${escapeHtml(data.description)}
</p><button>
Get Started
</button></section><section class="features"><div class="feature">
<h3>Modern Design</h3>
<p>
A clean and professional layout.
</p>
</div><div class="feature">
<h3>Responsive</h3>
<p>
Works across phones, tablets and computers.
</p>
</div><div class="feature">
<h3>Customizable</h3>
<p>
Continue editing your website.
</p>
</div></section></body>
</html>
`;previewFrame.srcdoc = html;

return html;
}

function escapeHtml(value) {

return value
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', """)
.replaceAll("'", "'");
}

generateBtn.addEventListener("click", () => {

const value = prompt.value.trim();

if (!value) {
statusText.textContent =
"Describe your website first.";
return;
}

statusText.textContent =
"Generating...";

setTimeout(() => {

const data =
  generateWebsite(value);

renderWebsite(data);

statusText.textContent =
  "Website generated";

}, 500);

});

document.querySelectorAll(".idea-btn")
.forEach(button => {

button.addEventListener("click", () => {

  prompt.value =
    button.dataset.prompt;

  generateBtn.click();

});

});

desktopBtn.addEventListener("click", () => {

previewFrame.style.width = "100%";

desktopBtn.classList.add("active");
mobileBtn.classList.remove("active");

});

mobileBtn.addEventListener("click", () => {

previewFrame.style.width = "390px";

mobileBtn.classList.add("active");
desktopBtn.classList.remove("active");

});

exportBtn.addEventListener("click", () => {

const value = prompt.value.trim();

if (!value) {
statusText.textContent =
"Generate a website first.";
return;
}

const data =
generateWebsite(value);

const html =
renderWebsite(data);

const blob =
new Blob(
[html],
{ type: "text/html" }
);

const url =
URL.createObjectURL(blob);

const link =
document.createElement("a");

link.href = url;
link.download =
"anivora-website.html";

document.body.appendChild(link);

link.click();

link.remove();

URL.revokeObjectURL(url);

statusText.textContent =
"Website exported";

});
