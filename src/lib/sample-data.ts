import { Folder, Deck, FlashCard } from '@/types';
import { createNewFSRSCard } from './fsrs';
import { generateThematicSvg } from './image-service';

export const INITIAL_FOLDERS: Folder[] = [
  {
    id: 'folder-demo-1',
    name: '🇺🇸 Английский язык',
    createdAt: Date.now() - 100000,
  },
];

export const INITIAL_DECKS: Deck[] = [
  {
    id: 'deck-demo-1',
    folderId: 'folder-demo-1',
    name: 'Живые разговорные фразы (Идиомы)',
    description: 'Натуральные фразы для беглой речи вместо учебных шаблонов',
    createdAt: Date.now() - 90000,
  },
];

export const INITIAL_CARDS: FlashCard[] = [
  {
    id: 'card-1',
    deckId: 'deck-demo-1',
    front: 'Мне нужно переспать с этой мыслью (подумать до утра)',
    back: 'I need to sleep on it',
    imageUrl: generateThematicSvg('sleep on it'),
    fsrsCard: createNewFSRSCard(),
    createdAt: Date.now() - 50000,
  },
  {
    id: 'card-2',
    deckId: 'deck-demo-1',
    front: 'Не принимай это близко к сердцу',
    back: "Don't take it to heart",
    imageUrl: generateThematicSvg('take to heart'),
    fsrsCard: createNewFSRSCard(),
    createdAt: Date.now() - 40000,
  },
  {
    id: 'card-3',
    deckId: 'deck-demo-1',
    front: 'Давай перейдём сразу к сути дела',
    back: "Let's cut to the chase",
    imageUrl: generateThematicSvg('cut to the chase'),
    fsrsCard: createNewFSRSCard(),
    createdAt: Date.now() - 30000,
  },
  {
    id: 'card-4',
    deckId: 'deck-demo-1',
    front: 'Я разрываюсь между двумя вариантами',
    back: "I'm torn between two options",
    imageUrl: generateThematicSvg('options torn'),
    fsrsCard: createNewFSRSCard(),
    createdAt: Date.now() - 20000,
  },
  {
    id: 'card-5',
    deckId: 'deck-demo-1',
    front: 'Это совсем вылетело у меня из головы',
    back: 'It completely slipped my mind',
    imageUrl: generateThematicSvg('mind slip'),
    fsrsCard: createNewFSRSCard(),
    createdAt: Date.now() - 10000,
  },
];
