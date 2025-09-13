// UI for a blank page to generate theory (HTML) and practice blocks
import { generateTheory, generateTask } from "../../api/chatGpt.js";

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const ch of children) {
    if (ch == null) continue;
    node.appendChild(typeof ch === "string" ? document.createTextNode(ch) : ch);
  }
  return node;
}

function initTheory() {
  const topicInput = document.getElementById("topic");
  const langSelect = document.getElementById("lang");
  const btnTheory = document.getElementById("btn-theory");
  const btnCopy = document.getElementById("btn-copy");
  const btnClear = document.getElementById("btn-clear");
  const out = document.getElementById("theory-output");
  const status = document.getElementById("theory-status");

  // Restore last topic
  const lastTopic = localStorage.getItem("genTopic") || "Present Simple";
  topicInput.value = lastTopic;

  async function onGenerate() {
    const topic = topicInput.value.trim();
    if (!topic) {
      status.textContent = "Введіть тему.";
      return;
    }
    localStorage.setItem("genTopic", topic);
    const lang = langSelect.value || "uk";
    btnTheory.disabled = true;
    btnTheory.textContent = "Генерую...";
    status.textContent = "";
    try {
      const html = await generateTheory(topic, { language: lang });
      if (typeof html !== "string" || html.length < 10) throw new Error("Порожня відповідь");
      // Insert as-is
      out.innerHTML = html;
      status.textContent = "Готово ✔";
    } catch (e) {
      console.error(e);
      status.textContent = "Помилка генерації";
    } finally {
      btnTheory.disabled = false;
      btnTheory.textContent = "Згенерувати теорію";
    }
  }

  function onCopy() {
    const html = out.innerHTML.trim();
    if (!html) {
      status.textContent = "Немає що копіювати.";
      return;
    }
    navigator.clipboard
      .writeText(html)
      .then(() => (status.textContent = "Скопійовано ✔"))
      .catch(() => (status.textContent = "Не вдалося скопіювати"));
  }

  function onClear() {
    out.innerHTML = "";
    status.textContent = "Очищено";
  }

  btnTheory.addEventListener("click", onGenerate);
  btnCopy.addEventListener("click", onCopy);
  btnClear.addEventListener("click", onClear);
}

function initPractice() {
  const topicInput = document.getElementById("topic");
  const btn = document.getElementById("btn-practice");
  const typeSel = document.getElementById("pr-type");
  const countInput = document.getElementById("pr-count");
  const status = document.getElementById("practice-status");

  async function onGeneratePractice() {
    const topic = (topicInput.value || "").trim() || "Present Simple";
    const type = typeSel.value;
    const count = parseInt(countInput.value, 10) || 10;
    if (!localStorage.getItem("gptToken")) {
      status.textContent = "Додай gptToken у localStorage (ключ gptToken).";
      return;
    }
    btn.disabled = true;
    btn.textContent = "Генерую...";
    status.textContent = "";
    try {
      const task = await generateTask(topic, type, { items: count, language: "uk", seedId: topic.slice(0, 6) });
      if (!task || !task.type) throw new Error("Невірний формат відповіді");
      if (window.practice && typeof window.practice.appendTask === "function") {
        window.practice.appendTask(task);
        status.textContent = "Додано ✔";
      } else {
        status.textContent = "Не знайдено рендерер practice.";
      }
    } catch (e) {
      console.error(e);
      status.textContent = "Помилка генерації";
    } finally {
      btn.disabled = false;
      btn.textContent = "Згенерувати практику";
    }
  }

  btn.addEventListener("click", onGeneratePractice);
}

document.addEventListener("DOMContentLoaded", () => {
  initTheory();
  initPractice();
});

