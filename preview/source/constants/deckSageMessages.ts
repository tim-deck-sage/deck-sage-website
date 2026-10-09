export const DeckSageMessages = {
  recovery: {
    title: 'Sage Lost the Trail',

    general:
      'Deck Sage could not complete that request right now. Check your connection and try again.',

    network:
      'Deck Sage could not reach the mana stream right now. Check your connection and try again.',

    cardLookup:
      'Deck Sage could not find that card right now. Check the name and try again.',

    scan:
      'Deck Sage could not read this card clearly. Try scanning again with better light and a steady hand.',
  },

  loading: {
    general: 'Sage is working...',
    cards: 'Sage is studying the cards...',
    prices: 'Sage is checking card values...',
    news: 'Sage is gathering MTG news...',
    decks: 'Sage is studying your decks...',
    scan: 'Sage is reading the card...',
  },

  actions: {
    tryAgain: 'Try Again',
    scanAgain: 'Scan Again',
    remove: 'Remove',
    cancel: 'Cancel',
    home: 'Home',
    back: 'Back',
    refresh: 'Refresh',
    search: 'Search',
    addCards: 'Add Cards',
    openDeck: 'Open Deck',
    continue: 'Continue',
  },

  alerts: {
    missingDeck: {
      title: 'Missing Deck',
      message:
        'Deck Sage could not determine which deck should receive these cards.',
    },

    noCards: {
      title: 'No Cards Found',
      message:
        'Deck Sage could not find any valid cards to add.',
    },

    stillProcessing: {
      title: 'Still Processing',
      message:
        'Sage is still studying some scanned cards. Please wait for processing to finish.',
    },

    cardsAdded: {
      title: 'Cards Added',
      single:
        'Your card has been added to the deck successfully.',
      multiple:
        'Your scanned cards have been added to the deck successfully.',
    },

    removeCard: {
      title: 'Remove Card',
      message:
        'Are you sure you want to remove this card from the review table?',
    },

    noInternet: {
      title: 'Connection Lost',
      message:
        'Deck Sage could not reach the mana stream. Check your connection and try again.',
    },

    refreshFailed: {
      title: 'Refresh Failed',
      message:
        'Deck Sage could not refresh this data right now. Try again in a moment.',
    },

    lookupFailed: {
      title: 'Card Lookup Failed',
      message:
        'Sage could not locate that card in the archives right now.',
    },
  },

  empty: {
    decksTitle: 'Your War Room Is Empty',

    decksMessage:
      'Deck Sage has not detected any saved commander decks yet.',

    bulkTitle: 'Your Bulk Vault Is Empty',

    bulkMessage:
      'Deck Sage has not detected any bulk cards yet.',

    reviewTitle: 'No Cards on the Review Table',

    reviewMessage:
      'Deck Sage did not receive any scanned cards to review.',
  },
};