
const DB_KEY="gw_pos_db_pro_v2";
let db=JSON.parse(localStorage.getItem(DB_KEY))||{
 categories:[],
 menus:[],
 transactions:[],
 settings:{footer:"Terima kasih sudah berbelanja"}
};
function saveDB(){localStorage.setItem(DB_KEY,JSON.stringify(db));}
function generateId(){return Date.now()+Math.floor(Math.random()*1000);}
