const fs = require('fs');
const {
  exec 
} = require('node:child_process');

const getSubtitles = (ytId) => {
  return new Promise(resolve => {
    exec(`youtube-dl --write-auto-sub --sub-lang en --skip-download https://www.youtube.com/watch?v=${ytId}`, (err, stdout, stderr) => {
      fs.readdir('./', (err, files) => {
        const vvtFileName = files.find(file => file.endsWith('.vtt'));
        const vttFile = fs.readFileSync(vvtFileName, 'utf8')
        const lines = vttFile.split('\n');
        let subs = lines[6];
        subs = subs.replace(/\s+/g, ' ');
        resolve(subs);
      });
    });
  })

}

const getDurationInMinutes = (ytId) => {
  return new Promise(resolve => {
    exec(`youtube-dl --get-duration --skip-download https://www.youtube.com/watch?v=${ytId}`, (err, stdout, stderr) => {
      const duration = stdout;
      const timeSegments = duration.split(':');
      if (timeSegments.length === 3) {
        const [hours, minutes, seconds] = timeSegments;
        resolve(+hours*60 + +minutes + +seconds / 60)
      } else {
        const [minutes, seconds] = timeSegments;
        resolve(+minutes + +seconds / 60)
      }
    });
  })
}

(async () => {
  const ytId = process.argv[2];
  // const ytId = 'korRfKTDoxE';
  // korRfKTDoxE learnwebcode
  const subs = await getSubtitles(ytId);
  const duration = await getDurationInMinutes(ytId);
  const words = subs.split(' ');
  const numberOfWords = words.length;
  console.log({
    duration,
    subs,
    numberOfWords,
  })
  const wpm = numberOfWords / duration;
  console.log(`wpm is ${wpm}`);
})()



// 167 wdj
// 166.38636363636363 learnwebcode