export const mcpClientScript = String.raw`
const dialog = document.querySelector("[data-fibel-mcp-dialog]");
const opener = document.querySelector("[data-fibel-mcp-open]");
const closeButton = dialog?.querySelector("[data-fibel-mcp-close]");
const endpoint = dialog?.getAttribute("data-endpoint");
const endpointUrl = endpoint ? new URL(endpoint, window.location.origin).toString() : "";
const tabs = Array.from(dialog?.querySelectorAll("[data-fibel-mcp-tab]") || []);
const panels = Array.from(dialog?.querySelectorAll("[data-fibel-mcp-panel]") || []);
const values = Array.from(dialog?.querySelectorAll("[data-fibel-mcp-value]") || []);
const copyButtons = Array.from(dialog?.querySelectorAll("[data-fibel-mcp-copy]") || []);
const status = dialog?.querySelector("[data-fibel-mcp-status]");
let previousOverflow = "";

for (const value of values) {
  const command = value.getAttribute("data-command");
  if (command && endpointUrl) value.textContent = command.replace("{endpoint}", endpointUrl);
}

const activateTab = (nextTab, focus = false) => {
  const client = nextTab?.getAttribute("data-fibel-mcp-tab");
  if (!client) return;
  for (const tab of tabs) {
    const selected = tab === nextTab;
    tab.setAttribute("aria-selected", String(selected));
    tab.setAttribute("tabindex", selected ? "0" : "-1");
  }
  for (const panel of panels) {
    panel.hidden = panel.getAttribute("data-fibel-mcp-panel") !== client;
  }
  if (status) status.textContent = "";
  if (focus) nextTab.focus();
};

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activateTab(tab));
  tab.addEventListener("keydown", (event) => {
    let nextIndex;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    activateTab(tabs[nextIndex], true);
  });
});

const openDialog = () => {
  if (!(dialog instanceof HTMLDialogElement)) return;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  dialog.showModal();
};

const closeDialog = () => {
  if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
};

opener?.addEventListener("click", openDialog);
closeButton?.addEventListener("click", closeDialog);

dialog?.addEventListener("click", (event) => {
  if (!(dialog instanceof HTMLDialogElement) || event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  const inside =
    event.clientX >= bounds.left &&
    event.clientX <= bounds.right &&
    event.clientY >= bounds.top &&
    event.clientY <= bounds.bottom;
  if (!inside) closeDialog();
});

dialog?.addEventListener("close", () => {
  document.body.style.overflow = previousOverflow;
  if (status) status.textContent = "";
  opener?.focus();
});

copyButtons.forEach((copyButton) => {
  copyButton.addEventListener("click", async () => {
    const value = copyButton.parentElement?.querySelector("[data-fibel-mcp-value]")?.textContent;
    if (!value) return;
    try {
      await copyText(value);
      if (status) status.textContent = copyButton.getAttribute("data-copied-label") || "Copied.";
    } catch {
      if (status) status.textContent = copyButton.getAttribute("data-error-label") || "Copy failed.";
    }
  });
});

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the selection-based copy path.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Copy failed.");
}
`;
