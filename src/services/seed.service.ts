import Auction from '../models/Auction';
import Player from '../models/Player';
import Team from '../models/Team';

const messiPhoto='https://commons.wikimedia.org/wiki/Special:FilePath/Lionel-Messi-Argentina-2022-FIFA-World-Cup_(cropped).jpg';
const ronaldoPhoto='https://commons.wikimedia.org/wiki/Special:FilePath/Cristiano_Ronaldo_playing_for_Al_Nassr_FC_against_Persepolis,_September_2023_(cropped).jpg';
const demoPlayers=[
  {seedKey:'demo-messi',name:'Lionel Messi',jerseyName:'MESSI',jerseyNumber:10,age:38,primaryPosition:'RW',secondaryPosition:'CAM',preferredFoot:'Left',playstyle:'Messi Playmaker',attributes:{pace:91,shooting:97,passing:99,dribbling:99,defending:45,physical:75},overall:99,basePrice:1500000,photoUrl:messiPhoto,countryCode:'ARG'},
  {seedKey:'demo-ronaldo',name:'Cristiano Ronaldo',jerseyName:'RONALDO',jerseyNumber:7,age:41,primaryPosition:'ST',secondaryPosition:'LW',preferredFoot:'Both',playstyle:'Ronaldo Clinical Finisher',attributes:{pace:95,shooting:99,passing:88,dribbling:94,defending:48,physical:99},overall:99,basePrice:1500000,photoUrl:ronaldoPhoto,countryCode:'POR'},
  {seedKey:'demo-aarav',name:'Aarav Sharma',jerseyName:'AARAV',jerseyNumber:9,age:22,primaryPosition:'ST',secondaryPosition:'LW',preferredFoot:'Right',playstyle:'Ronaldo Clinical Finisher',attributes:{pace:91,shooting:88,passing:72,dribbling:85,defending:40,physical:82},overall:86,basePrice:250000,countryCode:'IND'},
  {seedKey:'demo-zoya',name:'Zoya Khan',jerseyName:'ZOYA',jerseyNumber:8,age:24,primaryPosition:'CM',secondaryPosition:'CAM',preferredFoot:'Both',playstyle:'Box-to-Box Engine',attributes:{pace:82,shooting:76,passing:91,dribbling:88,defending:78,physical:80},overall:87,basePrice:500000,countryCode:'IND'},
  {seedKey:'demo-ethan',name:'Ethan Cole',jerseyName:'COLE',jerseyNumber:11,age:20,primaryPosition:'LW',secondaryPosition:'RW',preferredFoot:'Left',playstyle:'Messi Playmaker',attributes:{pace:95,shooting:83,passing:78,dribbling:91,defending:42,physical:70},overall:84,basePrice:100000,countryCode:'ENG'},
  {seedKey:'demo-nikhil',name:'Nikhil Verma',jerseyName:'VERMA',jerseyNumber:4,age:27,primaryPosition:'CB',secondaryPosition:'LB',preferredFoot:'Right',playstyle:'Brick Wall Defender',attributes:{pace:74,shooting:48,passing:77,dribbling:65,defending:91,physical:93},overall:83,basePrice:250000,countryCode:'IND'},
  {seedKey:'demo-mateo',name:'Mateo Silva',jerseyName:'SILVA',jerseyNumber:6,age:25,primaryPosition:'CDM',secondaryPosition:'CM',preferredFoot:'Right',playstyle:'Box-to-Box Engine',attributes:{pace:78,shooting:67,passing:86,dribbling:77,defending:88,physical:87},overall:84,basePrice:250000,countryCode:'BRA'},
  {seedKey:'demo-aanya',name:'Aanya Patel',jerseyName:'PATEL',jerseyNumber:1,age:23,primaryPosition:'GK',secondaryPosition:'',preferredFoot:'Right',playstyle:'Sweeper Keeper',attributes:{pace:68,shooting:42,passing:78,dribbling:70,defending:92,physical:89},overall:82,basePrice:100000,countryCode:'IND'},
  {seedKey:'demo-kabir',name:'Kabir Singh',jerseyName:'KABIR',jerseyNumber:2,age:26,primaryPosition:'RB',secondaryPosition:'CB',preferredFoot:'Right',playstyle:'Brick Wall Defender',attributes:{pace:86,shooting:60,passing:79,dribbling:79,defending:85,physical:84},overall:82,basePrice:250000,countryCode:'IND'},
  {seedKey:'demo-luca',name:'Luca Moretti',jerseyName:'MORETTI',jerseyNumber:10,age:21,primaryPosition:'CAM',secondaryPosition:'CM',preferredFoot:'Left',playstyle:'Messi Playmaker',attributes:{pace:80,shooting:84,passing:90,dribbling:90,defending:52,physical:68},overall:84,basePrice:500000,countryCode:'ITA'},
];
const demoTeams=[
  {name:'Friday Galacticos',code:'FRG',captainName:'Arjun Mehta',crest:{shape:'shield',icon:'⚡',primaryColor:'#00ff87',secondaryColor:'#10231b'}},
  {name:'Pitch Invaders',code:'PIN',captainName:'Samira Das',crest:{shape:'round',icon:'★',primaryColor:'#00e5ff',secondaryColor:'#12242e'}},
  {name:'Northside United',code:'NSU',captainName:'Rohan Kapoor',crest:{shape:'classic',icon:'♛',primaryColor:'#ffd700',secondaryColor:'#25200e'}},
];

/** Idempotent demo seed. Stable keys/codes prevent duplicate seed rows on restarts. */
export async function ensureDemoLeague(): Promise<void> {
  for (const player of demoPlayers) await Player.updateOne({seedKey:player.seedKey},{$setOnInsert:player},{upsert:true});
  for (const team of demoTeams) await Team.updateOne({code:team.code},{$setOnInsert:{...team,auctionPurse:10000000,remainingPurse:10000000,roster:[]}},{upsert:true});
  const existing=await Auction.findOne({key:'ffl-main-auction'});
  if (!existing) {
    const messi=await Player.findOne({seedKey:'demo-messi'});
    if (messi) {
      await Player.updateOne({_id:messi._id},{$set:{auctionStatus:'active'}});
      await Auction.create({key:'ffl-main-auction',status:'active',activePlayer:messi._id,startingPrice:messi.basePrice,currentBid:messi.basePrice,leadingTeam:null,bidHistory:[],version:1,startedAt:new Date()});
    }
  }
}
