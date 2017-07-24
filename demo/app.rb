require 'sinatra'
require 'sinatra/cookies'
require 'sinatra/content_for'
require 'sinatra/json'

require 'json'
require 'erubis'

require "sinatra/reloader" if development?

Dir["./lib/*.rb"].each {|f| require f }

use Rack::Deflater
set :erb, :escape_html => true
set :version, 'v0.1'

configure :development do
	Dir["./lib/*.rb"].each {|f| also_reload f }

	set :server, :thin
	set :bind, '127.0.0.1'
	set :port, 4567
end

get '/' do
	erb :home
end

Faye::WebSocket.load_adapter('thin')

get '/io' do
	if Faye::WebSocket.websocket?(request.env)
		ws = Faye::WebSocket.new(request.env)
		AppSocket.new(ws)
		ws.rack_response
	else
		return 'websockets only'
	end	
end
