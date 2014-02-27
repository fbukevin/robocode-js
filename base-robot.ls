importScripts('../log.js')

class BaseRobot
  me: {id: 0, x: 0, y: 0, hp: 0}
  enemy-robots: []

  (@name = "base-robot") ->
    @event_counter = 0
    @callbacks = {}
    self.onmessage = (e) ~>
      @receive(e.data)

    #@_run()


  move_forwards: (distance, callback = null) ->
    @send({
      "action": "move_forwards",
      "amount": distance
    }, callback)
  move_backwards: (distance, callback = null) ->
    @send({
      "action": "move_backwards",
      "amount": distance
    }, callback)
  turn_left: (angle, callback = null) ->
    @send({
      "action": "turn_left",
      "amount": angle
    }, callback)
  turn_right: (angle, callback = null) ->
    @send({
      "action": "turn_right",
      "amount": angle
    }, callback)
  shoot: ->
    @send({
      "action": "shoot"
    })

  receive: (msg) !->
    msg_obj = JSON.parse(msg)

    if msg_obj["enemy-robots"]
      # update enemy-robots array
      @enemy-robots = []
      for r in msg_obj["enemy-robots"]
        @enemy-robots.push {id: r.id, x: r.x, y: r.y, hp: r.hp}

    if msg_obj.me
      @me = msg_obj.me

    switch msg_obj["action"]
      #the first run
      when "run"
        @_run!

      #When finished an action
      when "callback"
        logger.log \callback
        logger.log @event_counter

        # XXX deprecated
        if typeof @callbacks[msg_obj["event_id"]] is "function"
          @callbacks[msg_obj["event_id"]]()

        @event_counter--
        if @event_counter == 0
          @_run!

      when "interruption"
        logger.log \interruption
        logger.log @event_counter
        # TODO the bot need to know its current position

        # clean all the event
        @event_counter = 0

        if msg_obj["status"].wall-collide
          @onWallCollide!

        if msg_obj["status"].is-hit
          @onHit!

        @_run!

  _run: ->
    logger.log @event_counter
    setTimeout(~>
      @onIdle!
    , 0)

  onIdle: !->
    throw "You need to implement the onIdle() method"

  onWallCollide: !->
    throw "You need to implement the onWallCollide() method"

  onHit: !->
    throw "You need to implement the onHit() method"

  getEnemyInfo: ->

  send: (msg_obj, callback) ->
    logger.log \send + " " + msg_obj.action
    event_id = @event_counter++
    @callbacks[event_id] = callback
    msg_obj["event_id"] = event_id
    postMessage(JSON.stringify(msg_obj))


@BaseRobot = BaseRobot
