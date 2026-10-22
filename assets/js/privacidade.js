(() => {
  document.getElementById('ano').textContent = new Date().getFullYear();
  const links = [...document.querySelectorAll('nav.toc a')];
  const secs = links.map(a => document.querySelector(a.getAttribute('href')));
  const spy = () => {
    let cur = 0; secs.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * .35) cur = i; });
    links.forEach((a, i) => a.classList.toggle('on', i === cur));
  };
  addEventListener('scroll', spy, { passive: true }); spy();
})();
