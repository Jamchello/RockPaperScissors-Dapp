function Header({currentUser}){
    return(
        <div className="rowC">
        <p style={{color:"white", textJustify:"left"}}>{currentUser !="" ? currentUser : "Not Connected"}</p>
        <h1 style={{flex:2,marginLeft:0, fontSize:"30px", color:"white"}}>Rock, Paper, Scissors</h1>
        </div>
    )
}

export default Header;