document.querySelectorAll('[role="tablist"]').forEach((tablist) => {
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));

  const selectTab = (tab) => {
    tabs.forEach((t) => {
      const selected = t === tab;
      t.setAttribute("aria-selected", String(selected));
      t.tabIndex = selected ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !selected;
    });
    tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab));

    tab.addEventListener("keydown", (event) => {
      const keys = { ArrowRight: 1, ArrowLeft: -1 };
      if (event.key in keys) {
        event.preventDefault();
        selectTab(tabs[(index + keys[event.key] + tabs.length) % tabs.length]);
      } else if (event.key === "Home") {
        event.preventDefault();
        selectTab(tabs[0]);
      } else if (event.key === "End") {
        event.preventDefault();
        selectTab(tabs[tabs.length - 1]);
      }
    });
  });
});
