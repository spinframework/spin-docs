import { $, $$ } from "./dom";

const noUpcomingEvents = `
        <article class="community-highlight carousel-cell">
        <a href="#">
            <event>
                <date>
                </date>
                <eventtitle>No upcoming Events
                </eventtitle>
                <p></p>
                <img class="event-logo" />
            </event>
        </a>
        </article>
        `;

// Drop community events whose expiry date has passed; if none remain, show a
// placeholder card.
export function removeExpiredEvents(): void {
  const events = $$<HTMLElement>(".community-highlight .carousel-cell");
  if (events.length === 0) return;

  let remaining = events.length;
  events.forEach((event) => {
    const expiry = event.dataset.expirydate;
    if (expiry && new Date(expiry).getTime() < Date.now()) {
      event.remove();
      remaining--;
    }
  });

  if (remaining === 0) {
    const carousel = $(".community-highlight");
    if (carousel) carousel.innerHTML = noUpcomingEvents;
  }
}
