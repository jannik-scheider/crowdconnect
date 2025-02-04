const { faker } = require('@faker-js/faker');

module.exports.getChatData = (userContext, events, done) => {
  // Erzeuge einen eindeutigen Namen basierend auf dem aktuellen Timestamp
  const timestamp = Date.now(); // Liefert die aktuelle Zeit in Millisekunden
  const randomSuffix = Math.floor(Math.random() * 1000); // Optional: Füge eine Zufallszahl hinzu, falls Timestamps kollidieren

  userContext.vars.name = `User${timestamp}${randomSuffix}`; // Kombiniere Timestamp und Zufallszahl
  userContext.vars.greeting = `Hello! I'm from ${faker.address.city()}`;
  userContext.vars.goodbye = `Goodbye, I will be back on ${faker.date.weekday()}`;
  userContext.vars.latency = timestamp;
  done();
};
