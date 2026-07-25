import type { Story } from "@/lib/types";

/** Newest first — the order the home screen lists them. */
export const stories: Story[] = [
  {
    id: "mothers-bread",
    narratorId: "aisulu",
    title: "The scent of my mother’s bread",
    era: "Winter 1954 · estimated",
    recordedLabel: "Today",
    durationSec: 167,
    isNew: true,
    excerpt:
      "The winter came early that year, and my mother baked bread every Thursday in the round oven behind the house.",
    paragraphs: [
      "I was six, maybe seven. The winter came early that year and the snow reached the windows. My mother Bibigul baked bread every Thursday, in the round oven my father built behind the house.",
      "She would send me to the neighbours with a warm loaf wrapped in a towel. My hands burned and froze at the same time. The whole street knew it was Thursday.",
      "I have never smelled anything like that bread again. When Dana was small I tried to bake it the same way. But the oven was wrong, the flour was wrong. Maybe the winter was wrong too.",
    ],
    mentions: ["bibigul", "dana"],
  },
  {
    id: "blue-bicycle",
    narratorId: "aisulu",
    title: "Marat’s blue bicycle",
    era: "Summer 1963 · estimated",
    recordedLabel: "Yesterday",
    durationSec: 143,
    excerpt:
      "There was one bicycle on our street, and it belonged to Marat. He rode past our gate four times every evening.",
    paragraphs: [
      "There was one bicycle on our street, and it belonged to Marat. Blue, with a silver bell he polished every morning like it was a medal.",
      "He rode past our gate four times every evening. My sister counted. On the fifth evening my father Sabyr stopped him at the fence and asked if he was lost.",
      "He was not lost. Two years later we were married. The bicycle stood in our yard until the year Timur was born.",
    ],
    mentions: ["marat", "sabyr", "timur"],
  },
  {
    id: "apple-orchard",
    narratorId: "aisulu",
    title: "The apple orchard in Almaty",
    era: "Autumn 1957 · estimated",
    recordedLabel: "Sunday",
    durationSec: 128,
    excerpt:
      "My father worked in the orchards above the city, where the aport apples grew bigger than my two hands together.",
    paragraphs: [
      "My father Sabyr worked in the orchards above the city, where the aport apples grew bigger than my two hands together.",
      "In September he lifted me onto his shoulders so I could reach the highest branch. He said a tree remembers everyone who waters it. I laughed at him then.",
      "Now I plant apple trees behind the house with Alikhan, and I am not laughing. I am watering.",
    ],
    mentions: ["sabyr", "alikhan"],
  },
  {
    id: "first-day-school",
    narratorId: "aisulu",
    title: "Dana’s first day of school",
    era: "September 1979",
    recordedLabel: "Last week",
    durationSec: 96,
    excerpt:
      "We sewed the white collar onto her dress the night before, and she slept in her ribbons so they would not be lost.",
    paragraphs: [
      "We sewed the white collar onto her dress the night before, and she slept in her ribbons so they would not be lost by morning.",
      "Dana walked ahead of us the whole way. She would not hold my hand — she was seven, and she was very busy being grown.",
      "At the school gate she turned around once, just once, to see that we were still there. Marat waved like the house was on fire. I still see her turning.",
    ],
    mentions: ["dana", "marat"],
  },
  {
    id: "nauryz-table",
    narratorId: "aisulu",
    title: "Nauryz at our table",
    era: "Spring 1985 · estimated",
    recordedLabel: "12 March",
    durationSec: 152,
    excerpt:
      "For Nauryz the table had to be full, that was the law of our house. Seven tastes in the kozhe.",
    paragraphs: [
      "For Nauryz the table had to be full, that was the law of our house. Seven tastes in the kozhe, and bauyrsak enough for every child on the street.",
      "Timur broke a bowl every single year. I do not know how he managed it. One year I gave him a metal one, and he dented the samovar instead.",
      "The door did not close from morning until night. Neighbours came without knocking. That is how a house should be — warm, loud, and smelling of bread.",
    ],
    mentions: ["timur"],
  },
];
