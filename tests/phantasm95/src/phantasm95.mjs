// Native anchor navigation remains the complete experience without JavaScript.
// No media autoplay, scroll interception, polling or new business requests.
const chapterLinks=[...document.querySelectorAll('.p-index a[href^="#"]')];
if('IntersectionObserver' in window){
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){if(!entry.isIntersecting)continue;
   for(const link of chapterLinks){if(link.hash==='#'+entry.target.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}
  }
 },{rootMargin:'-15% 0px -45% 0px'});
 for(const id of ['anatomy','craft','revelation']){const section=document.getElementById(id);if(section)observer.observe(section);}
}
