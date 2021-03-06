var amqp = require('amqplib/callback_api');
var shell = require('shelljs');

const download = require('image-downloader')
const config = require('config');
const dbConfig = config.get('rabbitMQ');

console.log("connect to " + dbConfig.url);
amqp.connect('amqp://'+dbConfig.username+':'+dbConfig.password+'@' + dbConfig.url, function(err, conn) {

  if (err)
  {
    console.log(err)
    return
  }

  conn.createChannel(function(err, ch) {
    var q = 'task_queue';
    ch.assertQueue(q, {durable: true});
    ch.prefetch(1);
    console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q);

    ch.consume(q, function(msg) {

      var imageName = msg.content.toString();

      var type = "";

      if (imageName.indexOf("image") != -1)
      {
        type = "image";
      }
      else if (imageName.indexOf("text") != -1)
      {
        type = "text";
      }

      var secs = msg.content.toString().split('.').length - 1;
      var urlImage = 'http://' + dbConfig.url + ":" + dbConfig.port + '/'+ imageName;
      var options = {
        url: urlImage,
        dest: __dirname + '/save_image'
      }

      console.log("donwload imange name " + urlImage);
      download.image(options)
      .then(({ filename, image }) => {
        console.log('File saved to', filename)
        console.log('Start print')

        shell.exec('convert save_image/' + imageName + ' -rotate 180 ' + 'save_image/' + imageName)
        shell.exec('lpr -o orientation-requested=6 ' + 'save_image/'+ imageName)
        console.log(" [x] Received %s", imageName);
        setTimeout(function() {
          console.log(" [x] Done");
          ch.ack(msg);
        }, secs * 1000);
        

      })
      .catch((err) => {
        console.error(err)
        console.log(" [x] Received %s", imageName);
        setTimeout(function() {
          console.log(" [x] Done");
          ch.ack(msg);
        }, secs * 1000);
      })
    }, {noAck: false});
  });
});