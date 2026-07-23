// Greedy "shortest column gets the next card" packing for the compact
// layout's category-card grid — a real masonry (measuring actual rendered
// pixel heights via ResizeObserver, reflowing as things change) would look
// nicer but also means the grid visibly reshuffles itself while you're
// mid-edit (typing a name, adding a row). Assignment count is a stable,
// cheap proxy for a card's height instead: every card has the same fixed
// header/options/footer chrome, plus one row per assignment, so counting
// rows gets you the same column balance without any DOM measurement or
// layout jank.
const CARD_CHROME_ROWS = 3;

export function distributeIntoColumns(categories, columnCount) {
  const columns = Array.from({ length: columnCount }, () => []);
  const heights = new Array(columnCount).fill(0);

  categories.forEach((cat) => {
    const weight = CARD_CHROME_ROWS + (cat.assignments?.length || 0);
    let shortest = 0;
    for (let i = 1; i < columnCount; i++) {
      if (heights[i] < heights[shortest]) shortest = i;
    }
    columns[shortest].push(cat);
    heights[shortest] += weight;
  });

  return columns;
}
