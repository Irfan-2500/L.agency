/* Line ko ungli / mouse se pakad kar left-right khiskana (tabs, class, saal wali lines)
   Use: <div data-drag> ... </div>  — page load par apne aap lag jaata hai. */
(function(){
 function dragScroll(row){
  if (!row || row._drag) return; row._drag = 1;
  row.style.touchAction = "pan-y"; row.style.cursor = "grab"; row.style.userSelect = "none"; row.style.webkitUserSelect = "none"; row.style.overscrollBehaviorX = "contain";
  var sx = 0, sl = 0, id = null, moved = false, vx = 0, lt = 0, lx = 0, raf = 0;
  row.addEventListener("pointerdown", function(e){ if (e.button > 0) return; cancelAnimationFrame(raf); id = e.pointerId; sx = lx = e.clientX; sl = row.scrollLeft; moved = false; vx = 0; lt = performance.now(); });
  row.addEventListener("pointermove", function(e){ if (e.pointerId !== id) return; var dx = e.clientX - sx;
   if (!moved && Math.abs(dx) > 6) { if (row.scrollWidth <= row.clientWidth + 2) { id = null; return; } moved = true; row.style.cursor = "grabbing"; try { row.setPointerCapture(id); } catch (_) {} }
   if (moved) { row.scrollLeft = sl - dx; var t = performance.now(); vx = (e.clientX - lx) / Math.max(1, t - lt); lx = e.clientX; lt = t; } });
  function end(e){ if (e.pointerId !== id) return; id = null; row.style.cursor = "grab";
   if (moved) { var v = -vx * 16; (function step(){ if (Math.abs(v) < .5) return; row.scrollLeft += v; v *= .92; raf = requestAnimationFrame(step); })(); } }
  row.addEventListener("pointerup", end); row.addEventListener("pointercancel", end);
  row.addEventListener("click", function(e){ if (moved) { e.preventDefault(); e.stopImmediatePropagation(); moved = false; } }, true);
  row.addEventListener("dragstart", function(e){ e.preventDefault(); });
 }
 window.dragScroll = dragScroll;
 function all(){ document.querySelectorAll("[data-drag]").forEach(dragScroll); }
 if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", all); else all();
})();
