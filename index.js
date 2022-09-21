const path = require('path');
const fs = require('fs')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const express = require('express');
const app = express();
const paths = ['login','signup','passwordreset','settings','activity','posts','explore','new','confirm'];
const { MetadataGenerator } = require('metatags-generator');

const indexPath  = path.resolve(__dirname, 'build', 'index.html');
const backendURL = process.env.REACT_APP_BACKEND_URL || `https://backpanel.dogegram.xyz`;

const settings = {
    androidChromeIcons: true,
    msTags: true,
    safariTags: true,
    appleTags: true,
    openGraphTags: true,
    twitterTags: true,
    facebookTags: true
  };    


var indexfile;
const load = () => {
    console.log('load')
    fs.readFile(indexPath, 'utf8', (err, data)=>{
        indexfile = data
       // console.log(data)
    });
}

load()

// static resources should just be served as they are
app.use(express.static(
    path.resolve(__dirname, 'build'),
    { maxAge: '30d' },
));

app.get('/post/:postId', async (req, res, next) => {
    try{
    const postId = req.params.postId;
    let htmlData = indexfile;
          
    const requsermeta = await fetch(`${backendURL}/api/post/internal/meta/${postId}`);
    const usermeta = await requsermeta.json();
    if(usermeta.error){
        //cache the index file for 2 mins but revalidate it
        res.set('Cache-Control', 'public, max-age=120, s-maxage=120, stale-while-revalidate=60');

        return res.send(indexfile)
    }

    const generator = new MetadataGenerator();

    const meta = generator
    .configure(settings)
    .setPageMeta({
        title: `@${usermeta.userName}'s Dogegram post`,
        description: `${usermeta.caption}`,
        url: `https://app.dogegram.xyz/post/${postId}`,
        image: `https://bom1-storage.dogegram.xyz/${usermeta.image.split('/').pop()}`,
        keywords: `site, website, profile`,
        locale: 'en_US'
    })
    .build();
   
    //kinda hacky but it works
    let metahtml = htmlData.replace('<meta name="description" content="The cool new social media platform!"/>', meta.head)
    metahtml = metahtml.replace(/(\r\n|\n|\r)/gm, "")

    return res.send(metahtml);
} catch(err){
    return res.send(indexfile)
}

})

app.get('/:userId', async (req, res, next) => {
    const userId = req.params.userId;
    if(!paths.includes(userId)){
        let htmlData = indexfile;
          
        const requsermeta = await fetch(`${backendURL}/api/user/internal/meta/${userId}`);
        const usermeta = await requsermeta.json();
        if(usermeta.error === 'Could not find a user with that username.'){
            //cache the index file for 2 mins but revalidate it
            res.set('Cache-Control', 'public, max-age=120, s-maxage=120, stale-while-revalidate=60');
           
            return res.send(indexfile)
        }

        const generator = new MetadataGenerator();

        const meta = generator
        .configure(settings)
        .setPageMeta({
            title: `${usermeta.name}'s dogegram profile`,
            description: `${usermeta.bio}`,
            url: `https://app.dogegram.xyz/${userId}`,
            image: `https://bom1-storage.dogegram.xyz/${usermeta.avatar.split('/').pop()}`,
            keywords: `site, website, profile, ${usermeta.name}`,
            locale: 'en_US'
        })
        .build();

       

        let metahtml = htmlData.replace('<meta name="description" content="The cool new social media platform!"/>', meta.head)
        metahtml = metahtml.replace(/(\r\n|\n|\r)/gm, "")
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.send(metahtml);
} else {
 return res.send(indexfile)
}
});

app.use(function (req, res, next) {
    res.status(200).send(indexfile)
  })

app.listen(process.env.PORT || 3000, async (error) => {
    if (error) {
        return console.log('Error during app startup', error);
    }
    var gitdatareq = await fetch('https://api.github.com/repos/Dogegram/Frontend/commits/master')
    var gitdata = await gitdatareq.json()
    console.log(`listening on ${process.env.PORT || 3000}...`);
    console.log(`running git commit hash: ${gitdata.sha.slice(0, 7)}...`);
    console.log(`git commit message: ${gitdata.commit.message}...`);
});
