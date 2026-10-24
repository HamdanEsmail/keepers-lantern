// The words of the story: the opening, the journal pages and the ending.
// This file isn't typed in a lesson, so the story stays a surprise until you play it.

export const OPENING = [
    'My father kept the beacon for forty years. While it burned, the woods stayed where they were.',
    "Last winter he walked into the deep woods and didn't come back. The beacon went dark that same night.",
    'Now the forest moves. Every morning the paths are somewhere new.',
    'His lantern still hangs by the tent. It still has oil.',
];

// Every journal page, in the order the journal lists them.
export const PAGE_IDS = ['lens-0', 'lens-1', 'lens-2', 'extra-1', 'extra-2', 'extra-3', 'final'];

// Each page has a title (shown in the journal's list) and its paragraphs.
export const PAGES = {
    'lens-0': {
        title: 'The first piece',
        body: [
            'I took the lens out of the beacon tonight. I broke it along the old seams, into three. My hands knew how.',
            "By morning the woods will start to move. I'm sorry. They'll stop when the beacon is whole again.",
            "I'm leaving the first piece out here, past the pines, where nobody comes by chance.",
            "If you're reading this, you didn't come by chance. You came looking. Good.",
        ],
    },
    'lens-1': {
        title: 'The second piece',
        body: [
            "When I was young, I thought the beacon held the forest still. It doesn't. The keeper does. The light is only how the woods know someone is awake.",
            'A keeper has to know the woods. Not the paths. The paths change. The woods.',
            "So I couldn't just hand you the lantern. You had to come out here and learn it, the way I did, one cold night at a time.",
            'The second piece is yours. One more.',
        ],
    },
    'lens-2': {
        title: 'The third piece',
        body: [
            "The cough is worse. I won't pretend, not in my own journal.",
            "I'm not coming back from this walk. Please don't go looking for me. I know where I'm going, and I'm not afraid of it.",
            "The wolves have followed me all day. They keep to the edge of the lantern, like always. They aren't hunting. They're keeping me company.",
            'Take the last piece home. Set it. The beacon will know your hands.',
        ],
    },
    'extra-1': {
        title: 'The wolves',
        body: [
            "My first winter as keeper, the wolves came to the edge of the light and sat there all night. I didn't sleep. I kept the fire so high I nearly burned the tent.",
            'They never crossed into the light. Not once in forty years.',
            "It took me a long time to see it. They aren't waiting to get in. They're watching the dark, same as me.",
        ],
    },
    'extra-2': {
        title: 'Your first lantern',
        body: [
            "You were six when you first carried the lantern. It was nearly as big as you. You held it with both arms and wouldn't let me help.",
            'You walked us all the way to the stream and back, and you told the trees to stay where they were. They did.',
            "I've never told you that. Maybe I should have.",
        ],
    },
    'extra-3': {
        title: 'Three nights',
        body: [
            "The winter you had the fever, I didn't climb the beacon for three nights. I sat by your bed instead.",
            'On the fourth morning the stream ran on the wrong side of the camp, and the berry bushes were gone.',
            'I lit the beacon again, and the woods settled. You never knew.',
            "I'd do it again. A forest can wait. You couldn't.",
        ],
    },
    final: {
        title: 'The last page',
        body: [
            "I left this inside the beacon, because you'd only find it once the light was back.",
            "So the light is back. You're the keeper now.",
            "I didn't get lost. I walked out to the deep woods and lay down under the old trees, and the wolves lay down around me. It was quiet. It was all right.",
            'Keep the fire high. Keep the lantern full. Come home before dark.',
            "I'm proud of you. I always was.",
        ],
    },
};

// Told one line at a time after the last page, like the opening.
export const ENDING = [
    'The light ran out across the valley, and the trees stopped where they stood.',
    "The wolves lay down at the edge of it. They didn't come any closer. They didn't go.",
    "Somewhere past the pines, he's sleeping under the old trees. The woods are keeping him now.",
    'I filled his lantern and hung it back by the tent.',
    'Tonight, nothing in the forest moved.',
];
