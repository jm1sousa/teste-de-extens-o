(() => {
  let isRunning = false;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Função para preencher inputs date (formato yyyy-mm-dd obrigatório no input date)
  function fillDateInput(input) {
    const start = new Date(1980, 0, 1).getTime();
    const end = new Date(2010, 11, 31).getTime();
    const date = new Date(start + Math.random() * (end - start));
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    input.value = dateStr;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    console.log("[FormFiller] Campo date preenchido com:", dateStr);
  }

  // Função para preencher input texto
  function fillTextInput(input) {
    const randomText = "Texto automático";
    input.value = randomText;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    console.log("[FormFiller] Campo texto preenchido com:", randomText);
  }

  // Função para preencher select
  function fillSelect(select) {
    const options = Array.from(select.options).filter((opt) => opt.value);
    if (options.length === 0) return;
    const randomOption = options[Math.floor(Math.random() * options.length)];
    select.value = randomOption.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    console.log("[FormFiller] Select preenchido com:", randomOption.value);
  }

  // Função para marcar checkbox
  function fillCheckbox(checkbox) {
    if (!checkbox.checked) {
      checkbox.click();
      console.log("[FormFiller] Checkbox marcado");
    }
  }

  async function fillForm() {
    if (!isRunning) return;
    const inputs = document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]), textarea");
    for (const input of inputs) {
      if (!isRunning) break;
      if (input.type === "date") {
        fillDateInput(input);
      } else if (input.type === "checkbox") {
        fillCheckbox(input);
      } else {
        fillTextInput(input);
      }
      await sleep(150);
    }

    const selects = document.querySelectorAll("select");
    for (const select of selects) {
      if (!isRunning) break;
      fillSelect(select);
      await sleep(150);
    }
  }

  async function run() {
    console.log("[FormFiller] Iniciado");
    while (isRunning) {
      await fillForm();
      await sleep(2000);
    }
    console.log("[FormFiller] Parado");
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[FormFiller] Mensagem recebida:", message);
    if (message.action === "start") {
      if (!isRunning) {
        isRunning = true;
        run();
      }
    } else if (message.action === "stop") {
      isRunning = false;
    }
  });

  console.log("[FormFiller] Content script carregado");
})();
