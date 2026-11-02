/* ===== Efecto al hacer scroll (todo el sitio) =====
   Hace aparecer cada bloque cuando entra a la pantalla, con un pequeño escalonado.
   No cambia contenido ni imágenes: solo agrega clases. */
(function(){
  "use strict";
  if(!("IntersectionObserver" in window))return;
  var doc=document.documentElement;doc.classList.add("sfx-activo");

  /* barra de avance arriba */
  var barra=document.createElement("div");barra.className="sfx-barra";document.body.appendChild(barra);
  function avance(){var h=doc.scrollHeight-innerHeight;barra.style.transform="scaleX("+(h>0?scrollY/h:0)+")"}
  addEventListener("scroll",avance,{passive:true});avance();

  /* qué se anima: [selector, tipo de entrada] */
  var grupos=[
    [".title-box",""],[".about-img","sfx-l"],[".about-info","sfx-l"],[".about-me","sfx-r"],[".skills-titulo",""],[".skill-grupo",""],
    [".service-box",""],[".counter-box","sfx-z"],[".card-blog",""],[".tl-item","sfx-l"],
    [".datasquad .container > *",""],[".contact-mf .title-box-2",""],[".contact-mf .more-info",""],[".contact-mf .socials","sfx-z"],
    [".post-meta",""],
    [".article-content > *",""],[".article-content .kb-item",""],[".article-content .st-card",""],[".article-content .kb-ej",""],
    [".article-content table",""],[".article-content figure","sfx-z"],[".article-content .st-fig","sfx-z"],
    [".tema-nav > a",""]
  ];
  var excluir=".intro, .navbar, .kb-scrolly, .kb-lab, .rv, .kb-aparece, script, style, .kb-volver, .tema-pill, .back-to-top";
  var marcados=[];
  grupos.forEach(function(g){[].forEach.call(document.querySelectorAll(g[0]),function(el){
    if(el.matches(excluir)||el.closest(".intro, .kb-scrolly, .kb-lab"))return;
    if(el.closest(".sfx")||el.querySelector(".sfx"))return;         /* sin animaciones anidadas */
    var cs=getComputedStyle(el);if(cs.position==="fixed"||cs.position==="sticky"||cs.display==="none")return;
    el.classList.add("sfx");if(g[1])el.classList.add(g[1]);marcados.push(el)})});

  /* escalonado entre hermanos */
  marcados.forEach(function(el){var p=el.parentElement,i=0,k=el.previousElementSibling;while(k&&i<8){if(k.classList.contains("sfx"))i++;k=k.previousElementSibling}
    if(el.classList.contains("tl-item")&&i%2)el.classList.replace("sfx-l","sfx-r");el.style.setProperty("--d",(Math.min(i,5)*0.08)+"s")});

  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("on");io.unobserve(e.target)}})},{rootMargin:"0px 0px -8% 0px",threshold:0.05});
  marcados.forEach(function(el){io.observe(el)});

  /* portada: el texto se va suavemente al bajar */
  var hero=document.querySelector(".intro .intro-content");
  if(hero){addEventListener("scroll",function(){var y=Math.min(scrollY,innerHeight);hero.style.transform="translateY("+(y*.35)+"px)";hero.style.opacity=String(1-y/(innerHeight*.85))},{passive:true})}
})();
