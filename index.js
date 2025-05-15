require('dotenv').config();
const {
   Bot,
   Keyboard,
   InlineKeyboard,
   GrammyError,
   HttpError,
} = require('grammy');
const { getRandomQuestion, getCorrectAnswer } = require('./utils');
const { incrementStat, getStats, resetStats } = require('./userStats');
const questions = require('./questions.json');

const bot = new Bot(process.env.BOT_API_KEY);

// /start
bot.command('start', async (ctx) => {
   const startKeyboard = new Keyboard()
       .text('HTML')
       .text('CSS')
       .row()
       .text('JavaScript')
       .text('React')
       .row()
       .text('Случайный вопрос')
       .resized();
   await ctx.reply(
       'Привет! Я - Frontend quiz bot 🤖\nЯ помогу подготовиться к интервью по фронтенду.'
   );
   await ctx.reply('С чего начнем? Выбери тему вопроса 👇', {
      reply_markup: startKeyboard,
   });
});

// /reset
bot.command('reset', async (ctx) => {
   resetStats(ctx.from.id);
   await ctx.reply('🔄 Ваша статистика была сброшена!');
});

// Обработка выбора темы
bot.hears(
    ['HTML', 'CSS', 'JavaScript', 'React', 'Случайный вопрос'],
    async (ctx) => {
       const topic = ctx.message.text.toLowerCase();
       const { question, questionTopic } = getRandomQuestion(topic);

       let inlineKeyboard;

       if (question.hasOptions) {
          const buttonRows = question.options.map((option) => [
             InlineKeyboard.text(
                 option.text,
                 JSON.stringify({
                    type: `${questionTopic}-option`,
                    isCorrect: option.isCorrect,
                    questionId: question.id,
                 })
             ),
          ]);

          inlineKeyboard = InlineKeyboard.from(buttonRows);
       } else {
          inlineKeyboard = new InlineKeyboard().text(
              'Узнать ответ',
              JSON.stringify({
                 type: questionTopic,
                 questionId: question.id,
              })
          );
       }

       await ctx.reply(question.text, {
          reply_markup: inlineKeyboard,
       });
    }
);

// Обработка ответа
bot.on('callback_query:data', async (ctx) => {
   const callbackData = JSON.parse(ctx.callbackQuery.data);
   const userId = ctx.from.id;

   if (!callbackData.type.includes('option')) {
      const topic = callbackData.type;
      const question = questions[topic].find((q) => q.id === callbackData.questionId);
      let response = question.answer;

      if (question.source) {
         response += `\n\n🔗 Подробнее: <a href="${question.source}" target="_blank">${question.source}</a>`;
      }

      await ctx.reply(response, {
         parse_mode: 'HTML',
         disable_web_page_preview: false,
      });
      await ctx.answerCallbackQuery();
      return;
   }

   const topic = callbackData.type.split('-')[0];
   const question = questions[topic].find((q) => q.id === callbackData.questionId);

   if (callbackData.isCorrect) {
      incrementStat(userId, true);
      await ctx.reply('Верно ✅');
   } else {
      incrementStat(userId, false);
      const correctAnswer = question.options.find((o) => o.isCorrect).text;
      const source = question.source
          ? `\n\n🔗 Подробнее: <a href="${question.source}" target="_blank">${question.source}</a>`
          : '';
      await ctx.reply(`Неверно ❌\nПравильный ответ: ${correctAnswer}${source}`, {
         parse_mode: 'HTML',
         disable_web_page_preview: false,
      });
   }

   const stats = getStats(userId);
   await ctx.reply(`📊 Ваша статистика:\n✅ Правильных: ${stats.correct}\n❌ Неправильных: ${stats.incorrect}`);

   await ctx.answerCallbackQuery();
});

// Глобальный catch
bot.catch((err) => {
   const ctx = err.ctx;
   console.error(`Ошибка при обработке update ${ctx.update.update_id}:`);
   const e = err.error;
   if (e instanceof GrammyError) {
      console.error('Ошибка запроса к Telegram:', e.description);
   } else if (e instanceof HttpError) {
      console.error('Не удалось подключиться к Telegram:', e);
   } else {
      console.error('Неизвестная ошибка:', e);
   }
});

// Запуск бота
bot.start();
