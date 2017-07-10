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

configure :production do

end

helpers do

	# basically the same as a regular halt, but it sends the message to the 
	# client with the content type 'text/plain'. This is important, because
	# the client error handlers look for that, and will display the message
	# if it is text/plain and short enough
	def halt_with_text(code, message = nil)
		message = message.to_s if !message.nil?
		halt code, {'Content-Type' => 'text/plain'}, message
	end

end

get '/' do
	erb :home
end

get '/io' do
	return 'websockets only' if !request.websocket?
	request.websocket { |ws| AppSocket.new(ws) }
end
