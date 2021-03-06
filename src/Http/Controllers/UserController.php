<?php
namespace Dataview\IOUser;

use Dataview\IntranetOne\IOController;
use Illuminate\Http\Response;

use Dataview\IntranetOne\User;
use App\Http\Requests;
use Dataview\IOUser\UserRequest;
use Sentinel;
use Activation;
use DataTables;
use Mail;
use Dataview\IOUser\Mail\UserActivation as UserActivation;

class UserController extends IOController{

	public function __construct(){
    	$this->service = 'user';
	}

  	public function index(){
		return view('User::index');
	}
	
	public function list(){
		$query = User::select('id','email', 'first_name', 'last_name')
		->where('id','!=','1')
		->with('roles')
		->get();

		$query->map(function ($q) {
			$user = Sentinel::findUserById($q->id);
			if($user->inRole('admin'))
				$q['admin'] = true;
			else
				$q['admin'] = false;
			
			if(Activation::completed($user))
				$q['activated'] = true;
			else
				$q['activated'] = false;

			return $q;
		});

		return Datatables::of($query)->make(true);
	}

	public function view($id){
		$check = $this->__view();
		if(!$check['status'])
			return response()->json(['errors' => $check['errors'] ], $check['code']);

    $userId = filter_var($id, FILTER_VALIDATE_EMAIL) ? User::whereEmail($id)->first()->id : $id;
		$sentinelUser = Sentinel::findUserById($userId);
		if($sentinelUser->inRole('admin'))
			$sentinelUser['admin'] = true;
		else
			$sentinelUser['admin'] = false;

		return response()->json(['success'=>true,'data'=>[$sentinelUser]]);
	}

	public function create(UserRequest $request){
		$check = $this->__create($request);
		if(!$check['status'])
		  return response()->json(['errors' => $check['errors'] ], $check['code']);	
		
		$user = Sentinel::register($request->all());
		$user->save();

		if($request->get('__admin')){
			$adminRole = Sentinel::findRoleBySlug('admin');
			$user->roles()->attach($adminRole);
		}else{
			$userRole = Sentinel::findRoleBySlug('user');
			$user->roles()->attach($userRole);
		}

		$activation = $this->createActivation($user->id);
	
		return response()->json(['success'=>true,'data'=>$request->get('email')]);
	}

	public function createActivation($userId, $extra=[]){
    
		try{
			$user = Sentinel::findById($userId);

			$activation = Activation::exists($user) ? Activation::where('user_id', $userId)->first() : Activation::create($user);

			$mailData = ["extra"=> $extra, 'user' => $user,'userActivationUrl' => route('user.activate', [$user->id, $activation->code])];
			Mail::to($user)->send(new UserActivation($mailData));
		}catch(\Exception $exception){
			return response()->json(['success'=>false,"AA"=>"aa",'message'=>$exception->getMessage()]);
		}
	
		return response()->json(['success'=>true,'message'=>$user->email]);
	}

	public function activate($userId, $token){
		$user = Sentinel::findById($userId);
		$activation = Activation::complete($user, $token);
		$messageBag = null;
		Sentinel::logout();

		if(!$activation){
			return redirect('/admin/signin')->with('activation', ['status' => false, 'message' => 'Não foi possível completar a ativação']);
		}

		return redirect('/admin/signin')->with('activation', ['status' => true, 'message' => 'Cadastro ativado com sucesso!']);
	}
	
	public function update($id, UserRequest $request){

		if($id != Sentinel::getUser()->id){
			$check = $this->__update($request);
			if(!$check['status'])
				return response()->json(['errors' => $check['errors'] ], $check['code']);
		}
		
		$user = Sentinel::findById($id);
		$adminRole = Sentinel::findRoleBySlug('admin');

		if($request->get('email') != $user->email){
			$user = Sentinel::update($user, $request->all());
			if($request->has('__admin') && $request->get('__admin') == true){
				$user->roles()->attach($adminRole);
			}else if($request->has('__admin') && $request->get('__admin') == false){
				$user->roles()->detach($adminRole);
			}

			if($id == Sentinel::getUser()->id){ 
				Sentinel::logout();
			}
			Activation::remove($user);
			$activation = $this->createActivation($user->id);
			return response()->json(['success'=>true, 'user'=>$user, 'email'=>$user->email]);
		}else{
			$user = Sentinel::update($user, $request->all());
			if($request->has('__admin') && $request->get('__admin') == true){
        $user->roles()->detach($adminRole);
				$user->roles()->attach($adminRole);
			}else if($request->has('__admin') && $request->get('__admin') == false){
				$user->roles()->detach($adminRole);
			}
			return response()->json(['success'=>true,'user'=>$user]);
		}
	}

	public function delete($id){
		$check = $this->__delete();
		if(!$check['status'])
			return response()->json(['errors' => $check['errors'] ], $check['code']);	

		$user = User::find($id);
		$user = $user->delete();
		return  json_encode(['sts'=>$user]);
	}
}
