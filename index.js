const axios = require("axios");
const fs = require('fs');
const ytdl = require("ytdl-core");
const readline = require('readline');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

var url
let playlistId
var skipIDs = ""

try {
  let data = JSON.parse(fs.readFileSync(".lastSession"))
  url = data.url
  skipIDs = data.skipIDs
} catch {}

rl.question(`Le Playlist URL plz\n${url!=undefined?"( "+url+" )\n":""}`, playlistURL => {

  url = playlistURL? playlistURL : url
  if (url==undefined) {
    process.stdout.write(`bya!\n`);
    return;
  }
	process.stdout.write(`tanks, alot!\n`);


	rl.question(`Skip any IDs? (seperated by comma)\n${skipIDs!=""?"( "+skipIDs+" )\n":""}`, ids => {
		process.stdout.write(`\naaaaight m8 gotcha\n`);

		skipIDs = ids? ids : skipIDs

    fs.writeFileSync(".lastSession", JSON.stringify({url, skipIDs}))
		scrapeURLs();
		rl.close();
	});
});






// Async function which scrapes the data
async function scrapeURLs() {
  try {
    playlistId = url.slice(url.indexOf("list="),url.indexOf("&index"))
    console.log("Playlist ID: "+playlistId);
  } catch {
    console.log("can't extract Playlist ID from URL. Check URL or Code (search for 'playlistId =')")
    return
  }
  try {
    const { data } = await axios.get(url);
    const htmlStr = data

    let arr = htmlStr.split('"watchEndpoint":{"videoId":"')
    var db = {}
    console.log(arr.length)

    for (var i = 1; i < arr.length; i++) {
     let str = arr[i]
     let eI = str.indexOf('"')

     if (str.slice(eI,eI+13) != '","playlistId') continue
      let sstr = str.slice(0,eI)
    db[sstr] = 1
  }
  console.log(Object.keys(db))
  console.log(Object.keys(db).length)

  downloadVideos(Object.keys(db), Object.keys(db).length)
} catch {
  console.log("can't scrape it sorry YT morphed again")
}
}

async function downloadVideos(videoIDs, total) {
	if (videoIDs.length<=0) {
		console.log("FINISH.")
		return
	}
	let videoID = videoIDs.pop()
	console.log("\n\nVideo "+(total-videoIDs.length)+" of "+total+" | "+videoID)

	let filename = "vids/"+videoID+'.mp4'

	if (skipIDs.indexOf(videoID) >= 0) {
		console.log("\nvideID in skipperlist\nskipping..")
		downloadVideos(videoIDs, total)
		return
	}
	try {	//SKIP this video, if file with same name exists
		fs.readFileSync(filename)
		console.log("\nfile with videoIDs name already exists\nskipping..")
		downloadVideos(videoIDs, total)
		return
	} catch {}

	try {
		let video = ytdl(videoID)
		let starttime

		video.pipe(fs.createWriteStream(filename));
		video.once('response', () => {
			starttime = Date.now();
		});
		video.on('progress', (chunkLength, downloaded, total) => {
			const percent = downloaded / total;
			const downloadedMinutes = (Date.now() - starttime) / 1000 / 60;
			const estimatedDownloadTime = (downloadedMinutes / percent) - downloadedMinutes;
			readline.cursorTo(process.stdout, 0);
			process.stdout.write(`${(percent * 100).toFixed(2)}% downloaded `);
			process.stdout.write(`(${(downloaded / 1024 / 1024).toFixed(2)}MB of ${(total / 1024 / 1024).toFixed(2)}MB)\n`);
			process.stdout.write(`running for: ${downloadedMinutes.toFixed(2)}minutes`);
			process.stdout.write(`, estimated time left: ${estimatedDownloadTime.toFixed(2)}minutes `);
			readline.moveCursor(process.stdout, 0, -1);
		});
		video.on('end', () => {
			process.stdout.write('\n\n');
			downloadVideos(videoIDs, total)
		});
		
	}catch{
		console.log("can't find: "+videoID)
		downloadVideos(videoIDs)
	}
}