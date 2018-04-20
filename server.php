<?php	
	$dbServer="";
	$dbUser="";
	$dbPassword="";
	$dbDatabase="";
	$db=@mysql_connect($dbServer,$dbUser,$dbPassword);
	mysql_query("set character_set_client='cp1251'");
	mysql_query("set character_set_results='cp1251'");
	mysql_query("set collation_connection='cp1251_general_ci'");

	if(!$db){
		echo mysql_error();
		exit();
	}

	if(!@mysql_select_db($dbDatabase,$db)){
		echo mysql_error();
		exit();
	}

	$data=mysql_fetch_array(mysql_query("SELECT * FROM mb"));
	echo $data["data"];
?>