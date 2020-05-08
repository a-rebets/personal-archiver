const emoji = (num) => String.fromCodePoint(num)

module.exports = {
  emoji: emoji,
  cache_err_msg: 'An error occured while trying to set a value to the Memcachier',
  welcome_msg: (name) => `Hi there, ${name}!\n` +
    `Thanks for using <b>Personal Archiver</b> ${emoji(0x1F60A)}\n\n` +
    'Now this bot knows who to ask, when performing various activities with the repositories.\n\n' +
    '<i>/ Yoga-octocat by Nadiia B.\n© Dribble /</i>',
  tg_stickers: {
    hey: 'CAACAgIAAxkBAANAXrTNn6KoDLgkjgwrYUAVBl4K27cAAtMAA1advQr1Mo-X1RL5PRkE',
    like: 'CAACAgIAAxkBAANCXrTNqHSBS7YnJG4xwPa8iLPq464AAtkAA1advQrRkmbS0mMHqBkE',
    love: 'CAACAgIAAxkBAANEXrTNqygkUNvBSUSgokPGtvDOY5IAAtIAA1advQoOBXI2dYM1ihkE',
    ok: 'CAACAgIAAxkBAANGXrTNr8sksnPrncLaiBlEOlDjbxUAAtgAA1advQqJCd2_S_EUJxkE',
    thinking: 'CAACAgIAAxkBAANIXrTNuBHcg79M1olXPeWS4-glXtYAAuMAA1advQoP-CLMraYLNxkE',
    panic: 'CAACAgIAAxkBAANKXrTN2LO0IPCvxuOVQN8njSY9RPAAArsAA1advQqZDiHIxejySBkE'
  }
}
