import nlp from "compromise";

const text = "whos kardos";
const doc = nlp(text);

console.log("ProperNoun:", doc.match("#ProperNoun").first().text().trim());
console.log("People:", doc.people().first().text().trim());
console.log("Places:", doc.places().first().text().trim());
console.log("Nouns:", doc.nouns().first().text().trim());
console.log("Nouns all:", doc.nouns().out("array"));
