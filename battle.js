// Generated by LiveScript 1.2.0
(function(){
  var $SET_TIMEOUT, $BULLET_SPEED, $HP, $SEQUENTIAL_EVENTS, $PARALLEL_EVENTS, AssetsLoader, degrees_to_radians, euclid_distance, in_rect, Robot, Battle;
  $SET_TIMEOUT = 10;
  $BULLET_SPEED = 3;
  $HP = 20;
  $SEQUENTIAL_EVENTS = ['move_forwards', 'move_backwards', 'turn_left', 'turn_right'];
  $PARALLEL_EVENTS = ['fire', 'turn_turret_left', 'turn_turret_right', 'turn_radar_left', 'turn_radar_right'];
  AssetsLoader = (function(){
    AssetsLoader.displayName = 'AssetsLoader';
    var prototype = AssetsLoader.prototype, constructor = AssetsLoader;
    function AssetsLoader(assets, callback){
      var name, uri, this$ = this;
      this.assets = assets;
      this.callback = callback;
      this._resources = 0;
      this._resources_loaded = 0;
      for (name in assets) {
        uri = assets[name];
        this._resources++;
        this.assets[name] = new Image();
        this.assets[name].src = uri;
      }
      for (name in assets) {
        uri = assets[name];
        this.assets[name].onload = fn$;
      }
      function fn$(){
        this$._resources_loaded++;
        if (this$._resources_loaded === this$._resources && typeof this$.callback === 'function') {
          return this$.callback();
        }
      }
    }
    prototype.is_done_loading = function(){
      return this._resources_loaded === this._resources;
    };
    prototype.get = function(asset_name){
      return this.assets[asset_name];
    };
    return AssetsLoader;
  }());
  degrees_to_radians = function(degrees){
    return degrees * (Math.PI / 180);
  };
  euclid_distance = function(x1, y1, x2, y2){
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  };
  in_rect = function(x1, y1, x2, y2, width, height){
    return (x2 + width > x1 && x1 > x2) && (y2 + height > y1 && y1 > y2);
  };
  Robot = (function(){
    Robot.displayName = 'Robot';
    var prototype = Robot.prototype, constructor = Robot;
    Robot.battlefieldWidth = 0;
    Robot.battlefieldHeight = 0;
    function Robot(x, y, source){
      var this$ = this;
      this.x = x;
      this.y = y;
      this.source = source;
      this.health = 100;
      this.angle = 0;
      this.turret_angle = 0;
      this.radar_angle = Math.random() * 360;
      this.bullet = null;
      this.events = {};
      this.status = {};
      this.health = $HP;
      this.id = 0;
      this.worker = new Worker(source);
      this.worker.onmessage = function(e){
        return this$.receive(e.data);
      };
    }
    Robot.setBattlefield = function(width, height){
      constructor.battlefieldWidth = width;
      return constructor.battlefieldHeight = height;
    };
    prototype.move = function(distance){
      this.x += distance * Math.cos(degrees_to_radians(this.angle));
      this.y += distance * Math.sin(degrees_to_radians(this.angle));
      if (in_rect(this.x, this.y, 15, 15, constructor.battlefieldWidth - 15, constructor.battlefieldHeight - 15)) {
        logger.log('not-wall-collide');
        return this.status.wallCollide = false;
      } else {
        logger.log('wall-collide');
        return this.status.wallCollide = true;
      }
    };
    prototype.turn = function(degrees){
      return this.angle += degrees;
    };
    prototype.receive = function(msg){
      var event, event_id;
      event = JSON.parse(msg);
      if (event.log !== undefined) {
        logger.log(event.log);
        return;
      }
      if (event.action === "shoot" && this.bullet) {
        this.send({
          "action": "callback",
          "event_id": event["event_id"]
        });
        return;
      }
      if (event.action === "shoot") {
        this.bullet = {
          x: this.x,
          y: this.y,
          direction: this.angle + this.turret_angle
        };
        this.send({
          "action": "callback",
          "event_id": event["event_id"]
        });
        return;
      }
      event["progress"] = 0;
      event_id = event["event_id"];
      logger.log("got event " + event_id + "," + event.action);
      return this.events[event_id] = event;
    };
    prototype.send = function(msg_obj){
      return this.worker.postMessage(JSON.stringify(msg_obj));
    };
    prototype.sendInterruption = function(){
      logger.log('send-interruption');
      return this.send({
        "action": "interruption",
        "x": this.x,
        "y": this.y,
        "status": this.status
      });
    };
    prototype.updateBullet = function(){
      var bullet_wall_collide, i$, ref$, len$, enemy_robot, robot_hit;
      this.bullet.x += $BULLET_SPEED * Math.cos(degrees_to_radians(this.bullet.direction));
      this.bullet.y += $BULLET_SPEED * Math.sin(degrees_to_radians(this.bullet.direction));
      bullet_wall_collide = !in_rect(this.bullet.x, this.bullet.y, 2, 2, constructor.battlefieldWidth - 2, constructor.battlefieldHeight - 2);
      if (bullet_wall_collide) {
        this.bullet = null;
        return true;
      }
      for (i$ = 0, len$ = (ref$ = Battle.robots).length; i$ < len$; ++i$) {
        enemy_robot = ref$[i$];
        if (enemy_robot.id === this.id) {
          continue;
        }
        robot_hit = euclid_distance(this.bullet.x, this.bullet.y, enemy_robot.x, enemy_robot.y) < 20;
        if (robot_hit) {
          enemy_robot.health -= 3;
          Battle.explosions.push({
            x: enemy_robot.x,
            y: enemy_robot.y,
            progress: 1
          });
          this.bullet = null;
          return true;
        }
      }
      return false;
    };
    prototype.update = function(){
      var has_sequential_event, isBulletHit, event_id, ref$, event;
      has_sequential_event = false;
      isBulletHit = false;
      if (this.bullet) {
        isBulletHit = this.updateBullet();
      }
      for (event_id in ref$ = this.events) {
        event = ref$[event_id];
        if ($SEQUENTIAL_EVENTS.indexOf(event.action !== -1)) {
          if (has_sequential_event) {
            continue;
          }
          has_sequential_event = true;
        }
        logger.log("events[" + event_id + "] = {action=" + event.action + ",progress=" + event.progress + "}");
        if (event["amount"] <= event["progress"]) {
          this.send({
            "action": "callback",
            "event_id": event["event_id"]
          });
          delete this.events[event_id];
        } else {
          switch (event["action"]) {
          case "move_forwards":
            event["progress"]++;
            this.move(1);
            if (this.status.wallCollide) {
              this.events = {};
              this.sendInterruption();
              break;
            }
            break;
          case "move_backwards":
            event["progress"]++;
            this.move(-1);
            if (this.status.wallCollide) {
              this.events = {};
              this.sendInterruption();
              break;
            }
            break;
          case "turn_left":
            event["progress"]++;
            this.turn(-1);
            break;
          case "turn_right":
            event["progress"]++;
            this.turn(1);
          }
        }
      }
    };
    return Robot;
  }());
  Battle = (function(){
    Battle.displayName = 'Battle';
    var prototype = Battle.prototype, constructor = Battle;
    Battle.robots = [];
    Battle.explosions = [];
    function Battle(ctx, width, height, sources){
      var res$, i$, len$, source, id, ref$, r;
      this.ctx = ctx;
      this.width = width;
      this.height = height;
      constructor.explosions = [];
      Robot.setBattlefield(this.width, this.height);
      res$ = [];
      for (i$ = 0, len$ = sources.length; i$ < len$; ++i$) {
        source = sources[i$];
        res$.push(new Robot(Math.random() * this.width, Math.random() * this.height, source));
      }
      constructor.robots = res$;
      id = 0;
      for (i$ = 0, len$ = (ref$ = constructor.robots).length; i$ < len$; ++i$) {
        r = ref$[i$];
        r.id = id;
        id++;
      }
      this.assets = new AssetsLoader({
        "body": 'img/body.png',
        "turret": 'img/turret.png',
        "radar": 'img/radar.png',
        'explosion1-1': 'img/explosion/explosion1-1.png',
        'explosion1-2': 'img/explosion/explosion1-2.png',
        'explosion1-3': 'img/explosion/explosion1-3.png',
        'explosion1-4': 'img/explosion/explosion1-4.png',
        'explosion1-5': 'img/explosion/explosion1-5.png',
        'explosion1-6': 'img/explosion/explosion1-6.png',
        'explosion1-7': 'img/explosion/explosion1-7.png',
        'explosion1-8': 'img/explosion/explosion1-8.png',
        'explosion1-9': 'img/explosion/explosion1-9.png',
        'explosion1-10': 'img/explosion/explosion1-10.png',
        'explosion1-11': 'img/explosion/explosion1-11.png',
        'explosion1-12': 'img/explosion/explosion1-12.png',
        'explosion1-13': 'img/explosion/explosion1-13.png',
        'explosion1-14': 'img/explosion/explosion1-14.png',
        'explosion1-15': 'img/explosion/explosion1-15.png',
        'explosion1-16': 'img/explosion/explosion1-16.png',
        'explosion1-17': 'img/explosion/explosion1-17.png'
      });
    }
    prototype.run = function(){
      this.send_all({
        "action": "run"
      });
      return this._loop();
    };
    prototype._loop = function(){
      var this$ = this;
      this._update();
      this._draw();
      return setTimeout(function(){
        return this$._loop();
      }, $SET_TIMEOUT);
    };
    prototype.send_all = function(msg_obj){
      var i$, ref$, len$, robot, results$ = [];
      for (i$ = 0, len$ = (ref$ = constructor.robots).length; i$ < len$; ++i$) {
        robot = ref$[i$];
        results$.push(robot.send(msg_obj));
      }
      return results$;
    };
    prototype._update = function(){
      var i$, ref$, len$, robot, results$ = [];
      for (i$ = 0, len$ = (ref$ = constructor.robots).length; i$ < len$; ++i$) {
        robot = ref$[i$];
        results$.push(robot.update());
      }
      return results$;
    };
    prototype._draw = function(){
      var i$, ref$, len$, robot, i, explosion, results$ = [];
      this.ctx.clearRect(0, 0, this.width, this.height);
      for (i$ = 0, len$ = (ref$ = constructor.robots).length; i$ < len$; ++i$) {
        robot = ref$[i$];
        this.ctx.save();
        this.ctx.translate(robot.x, robot.y);
        this.ctx.rotate(degrees_to_radians(robot.angle));
        this.ctx.drawImage(this.assets.get("body"), -(38 / 2), -(36 / 2), 38, 36);
        this.ctx.rotate(degrees_to_radians(robot.turret_angle));
        this.ctx.drawImage(this.assets.get("turret"), -(54 / 2), -(20 / 2), 54, 20);
        this.ctx.rotate(degrees_to_radians(robot.radar_angle));
        this.ctx.drawImage(this.assets.get("radar"), -(16 / 2), -(22 / 2), 16, 22);
        this.ctx.restore();
        if (robot.bullet) {
          this.ctx.save();
          this.ctx.translate(robot.bullet.x, robot.bullet.y);
          this.ctx.rotate(degrees_to_radians(robot.bullet.direction));
          this.ctx.fillRect(-3, -3, 6, 6);
          this.ctx.restore();
        }
      }
      for (i$ = 0, len$ = (ref$ = constructor.explosions).length; i$ < len$; ++i$) {
        i = ref$[i$];
        explosion = constructor.explosions.pop();
        if (explosion.progress <= 17) {
          this.ctx.drawImage(this.assets.get("explosion1-" + parseInt(explosion.progress)), explosion.x - 64, explosion.y - 64, 128, 128);
          explosion.progress += 1;
          results$.push(constructor.explosions.unshift(explosion));
        }
      }
      return results$;
    };
    return Battle;
  }());
  window.Battle = Battle;
}).call(this);
