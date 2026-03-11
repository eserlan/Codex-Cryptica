export const getDiceIcon = (sides?: number) => {
  switch (sides) {
    case 4:
      return "icon-[mdi--dice-d4]";
    case 6:
      return "icon-[mdi--dice-d6]";
    case 8:
      return "icon-[mdi--dice-d8]";
    case 10:
      return "icon-[mdi--dice-d10]";
    case 12:
      return "icon-[mdi--dice-d12]";
    case 20:
      return "icon-[mdi--dice-d20]";
    default:
      return "icon-[mdi--dice-multiple]";
  }
};
