const puppeteer = require("puppeteer");
const config = require("./config.json");
const debug = false;
const responses = { tables: {}, words: {} };

(async () => {
  const loginBrowser = await puppeteer.launch({
    headless: false,
  });
  const loginPage = await loginBrowser.newPage();
  await loginPage.goto("https://www.projet-voltaire.fr/");

  //login
  await loginPage.click("#cmpbntyestxt");
  await loginPage.waitForTimeout(500);
  await loginPage.click("#authenticateOption");
  await loginPage.waitForTimeout(500);
  await loginPage.type("#login-username", config.email ? config.email : "");
  await loginPage.type("#login-pwd", config.password ? config.password : "");
  await loginPage.waitForNavigation({
    timeout: 120000,
  });

  const cookies = await loginPage.cookies();
  const url = loginPage.url();
  await loginPage.close();
  await loginBrowser.close();

  const browser = await puppeteer.launch({
    headless: true,
  });
  const page = await browser.newPage();
  await page.setCookie(...cookies);
  await page.goto(url);

  //go to exercise
  await page.waitForTimeout(1500);
  await page.click("button");
  await page.waitForTimeout(1500);
  await page.click(".app-circle-title");
  await page.waitForTimeout(1500);

  await getTime(page, 0);

  await question(page, 0);
  //await browser.close();
})();

async function question(page, interation) {
  await page.waitForTimeout(1250);
  let part = "";
  try {
    if ((await page.$(".popupButton")) !== null) {
      if (debug) console.log("popupButton");
      part = "popupButton";
      await page.click(".popupButton");
    } else if ((await page.$(".understoodButton")) !== null) {
      if (debug) console.log("understoodButton");
      part = "understoodButton";
      await page.waitForTimeout(1750);
      let understoodButtonClicked = false;
      let count = 0;
      while (!understoodButtonClicked && count < 5) {
        try {
          count++;
          await page.click(".understoodButton");
          understoodButtonClicked = true;
        } catch {
          await page.waitForTimeout(500);
        }
      }
      if (!understoodButtonClicked) {
        await page.click(".understoodButton");
      }
      await page.waitForTimeout(300);

      if (await page.$(".innerIntensiveQuestions")) {
        await page.click(".innerIntensiveQuestions > div:nth-child(1) > .intensiveQuestion > .buttonOk");
        await page.waitForTimeout(100);
        await page.click(".innerIntensiveQuestions > div:nth-child(2) > .intensiveQuestion > .buttonOk");
        await page.waitForTimeout(100);
        await page.click(".innerIntensiveQuestions > div:nth-child(3) > .intensiveQuestion > .buttonOk");

        await page.waitForTimeout(350);
        await page.click(".exitButton");
      }
    } else if ((await page.$(".sentence")) !== null) {
      if (debug) console.log("sentence");
      part = "sentence";

      await page.waitForTimeout(1000);
      const listOfWords = await page.evaluate(() => {
        const listOfWords = [];
        const childs = document.querySelector(".sentence").childNodes;
        for (const child of childs) {
          if (child.innerText !== " " && child.innerText !== "–") {
            listOfWords.push(child.innerText);
          }
        }
        return listOfWords;
      });

      for (const word of listOfWords) {
        if (responses.words[word] === undefined) responses.words[word] = true;
      }

      await page.evaluate((words) => {
        const childs = document.querySelector(".sentence").childNodes;
        for (let index = 0; index < childs.length; index++) {
          const child = childs[index];
          if (child.innerText !== " " && child.innerText !== "–") {
            if (!words[child.innerText]) console.log(!words[child.innerText] + " - " + child.innerText);
            if (!words[child.innerText] || index == childs.length - 1) {
              console.log("choosed -> " + child.innerText);
              child.click();
              return;
            }
          }
        }
      }, responses.words);

      const response = await page.evaluate(() => {
        const childs = document.querySelector(".sentence").childNodes;
        for (const child of childs) {
          if (child.childNodes.length !== 1) {
            return child.innerText;
          }
        }
        return null;
      });

      const keys = Object.keys(responses.words);
      for (const key of keys) {
        if (
          response &&
          response.includes(key) &&
          !["la", "le", "une", "un", "je", "tu", "il", "elle", "nous", "vous", "ils", "a"].includes(key)
        )
          responses.words[key] = false;
      }

      await page.waitForTimeout(1000);
      await page.click(".nextButton");
      await page.waitForTimeout(300);
    } else if ((await page.$(".noMistakeButton")) !== null) {
      if (debug) console.log("noMistakeButton");
      part = "noMistakeButton";

      await page.waitForTimeout(1750);
      await page.click(".noMistakeButton");
      await page.waitForTimeout(300);

      if (await page.$(".innerIntensiveQuestions")) {
        await page.click(".innerIntensiveQuestions > div:nth-child(1) > .intensiveQuestion > .buttonOk");
        await page.waitForTimeout(100);
        await page.click(".innerIntensiveQuestions > div:nth-child(2) > .intensiveQuestion > .buttonOk");
        await page.waitForTimeout(100);
        await page.click(".innerIntensiveQuestions > div:nth-child(3) > .intensiveQuestion > .buttonOk");

        await page.waitForTimeout(350);
        await page.click(".exitButton");
      }
    } else if ((await page.$(".drag-and-drop-mode")) !== null) {
      if (debug) console.log("table");

      await page.waitForTimeout(1000);
      const proposal1 = await page.$(".proposals>div:nth-child(1)");
      const proposalText1 = await page.evaluate((text) => text.innerText, proposal1);
      const proposal2 = await page.$(".proposals>div:nth-child(2)");
      const proposalText2 = await page.evaluate((text) => text.innerText, proposal2);
      const proposal3 = await page.$(".proposals>div:nth-child(3)");
      const proposalText3 = await page.evaluate((text) => text.innerText, proposal3);
      const proposal4 = await page.$(".proposals>div:nth-child(4)");
      const proposalText4 = await page.evaluate((text) => text.innerText, proposal4);
      const answer1 = await page.$(".categoryDiv>div:nth-child(1)>button");
      const answerText1 = await page.evaluate((text) => text.innerText, answer1);
      const answer2 = await page.$(".categoryDiv>div:nth-child(2)>button");
      const answerText2 = await page.evaluate((text) => text.innerText, answer2);

      if (
        responses["tables"][proposalText1] &&
        responses["tables"][proposalText2] &&
        responses["tables"][proposalText3] &&
        responses["tables"][proposalText4]
      ) {
        const dropZone1 = await page.$(".category1>div");
        const dropZone1BoundingBox = await dropZone1.boundingBox();
        const dropZone2 = await page.$(".category2>div");
        const dropZone2BoundingBox = await dropZone2.boundingBox();
        const answer1Text = await page.evaluate(() => document.querySelector(".category1>button").innerText, {});
        for (const answer of [
          { object: proposal1, text: proposalText1 },
          { object: proposal2, text: proposalText2 },
          { object: proposal3, text: proposalText3 },
          { object: proposal4, text: proposalText4 },
        ]) {
          const boundingBox = await answer.object.boundingBox();

          await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
          await page.mouse.down();
          if (responses["tables"][answer.text] === answer1Text) {
            await page.mouse.move(
              dropZone1BoundingBox.x + dropZone1BoundingBox.width / 2,
              dropZone1BoundingBox.y + dropZone1BoundingBox.height / 2
            );
          } else {
            await page.mouse.move(
              dropZone2BoundingBox.x + dropZone2BoundingBox.width / 2,
              dropZone2BoundingBox.y + dropZone2BoundingBox.height / 2
            );
          }
          await page.mouse.up();
        }

        await page.click("#btn_validate_answer");
        await page.waitForTimeout(2500);
      } else {
        await page.click("#btn_validate_answer");
        await page.waitForTimeout(5000);

        for (let indexPropal = 1; indexPropal <= 2; indexPropal++) {
          for (let index = 1; index <= 4; index++) {
            try {
              const answerText = await page.evaluate(
                ({ indexPropal, index }) =>
                  document.querySelector(`.category${indexPropal}>div>button:nth-child(${index})`).innerText,
                {
                  indexPropal,
                  index,
                }
              );

              responses["tables"][answerText] = indexPropal === 1 ? answerText1 : answerText2;
            } catch (error) {
              //console.log(`.category${indexPropal}>div>button:nth-child(${index})`);
              //console.log(error);
            }
          }
        }
      }

      await page.click("#btn_question_suivante");
      await page.waitForTimeout(300);
    } else {
      if (debug) console.log("nothing");
      part = "nothing";
    }

    interation++;
    if (interation === 50 || interation % 200 === 0) await getTime(page, interation);
  } catch (error) {
    console.log("error : " + part);
    console.log(error);
    await getTime(page, interation);
  }
  return question(page, interation);
}

async function getTime(page, interation) {
  await page.reload();
  await page.waitForTimeout(2500);

  await page.waitForSelector(".home-using-time-value");
  const text = await page.$(".home-using-time-value");
  const time = await page.evaluate((text) => text.innerText, text);
  const dt = new Date();

  console.log(("0" + dt.getHours()).slice(-2) + ":" + ("0" + dt.getMinutes()).slice(-2) + " | " + time);

  await page.click("button[id^='btn_home_module_lancer_']:not([style*='display: none'])");
  await page.waitForTimeout(500);
  return;
}
